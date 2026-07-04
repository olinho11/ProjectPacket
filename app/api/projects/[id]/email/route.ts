import { NextResponse } from "next/server";
import { canUseClientEmail, EMAIL_UPGRADE_MESSAGE } from "@/src/plans";
import { getAuthenticatedRequestUser } from "@/src/supabase/server-auth";
import type { Plan } from "@/src/types";

export const dynamic = "force-dynamic";

type EmailType = "invite" | "reminder" | "completion";

interface EmailBody {
  type?: EmailType;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthenticatedRequestUser(request);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as EmailBody;

    if (!body.type || !["invite", "reminder", "completion"].includes(body.type)) {
      return NextResponse.json({ error: "Choose a valid email type." }, { status: 400 });
    }

    const { supabase, user } = auth;
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,user_id,client_name,client_email,name,due_date,status,token")
      .eq("id", params.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this project." }, { status: 403 });
    }

    const subscription = await getSubscriptionForUser(supabase, user.id);

    if (!canUseClientEmail(subscription.plan)) {
      return NextResponse.json({ error: EMAIL_UPGRADE_MESSAGE }, { status: 403 });
    }

    if (!project.client_email) {
      return NextResponse.json({ error: "Add a client email before sending email." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name,business_name,email")
      .eq("id", user.id)
      .maybeSingle();
    const { data: items, error: itemsError } = await supabase
      .from("checklist_items")
      .select("title,required,status,change_request_note")
      .eq("project_id", project.id)
      .order("sort_order", { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    const email = buildProjectEmail({
      type: body.type,
      project: {
        clientName: project.client_name,
        clientEmail: project.client_email,
        name: project.name,
        token: project.token
      },
      businessName: profile?.business_name ?? profile?.name ?? "Your freelancer",
      items: items ?? []
    });
    await sendResendEmail({
      to: project.client_email,
      subject: email.subject,
      text: email.text
    });

    const message = activityMessageForEmail(body.type, project.client_name);
    const timestamp = new Date().toISOString();
    const { data: log, error: logError } = await supabase
      .from("activity_logs")
      .insert({
        project_id: project.id,
        message,
        created_at: timestamp
      })
      .select("id,project_id,message,created_at")
      .single();

    if (logError) {
      console.warn("Email sent, but activity log did not save:", logError.message);
    }

    return NextResponse.json({
      message,
      log: log
        ? {
            id: log.id,
            projectId: log.project_id,
            message: log.message,
            createdAt: log.created_at
          }
        : null
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Could not send email." },
      { status: 500 }
    );
  }
}

function buildProjectEmail({
  type,
  project,
  businessName,
  items
}: {
  type: EmailType;
  project: { clientName: string; clientEmail: string; name: string; token: string };
  businessName: string;
  items: Array<{ title: string; required: boolean; status: string; change_request_note?: string | null }>;
}) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://projectpacket.vercel.app").replace(/\/$/, "");
  const packetUrl = `${appUrl}/p/${project.token}`;
  const missingItems = items.filter(
    (item) => item.required && ["requested", "changes_requested"].includes(item.status)
  );
  const changeItems = items.filter((item) => item.status === "changes_requested");
  const missingText = missingItems.length
    ? missingItems.map((item) => `- ${item.title}`).join("\n")
    : "- Nothing is currently missing.";
  const changeText = changeItems.length
    ? `\n\nItems needing changes:\n${changeItems
        .map((item) => `- ${item.title}${item.change_request_note ? `: ${item.change_request_note}` : ""}`)
        .join("\n")}`
    : "";

  if (type === "completion") {
    return {
      subject: `${project.name} is complete`,
      text: `Hi ${project.clientName},\n\n${businessName} marked your ProjectPacket complete.\n\nYou can still view the packet here:\n${packetUrl}\n\nThanks,\n${businessName}`
    };
  }

  if (type === "reminder") {
    return {
      subject: `Reminder: ${project.name}`,
      text: `Hi ${project.clientName},\n\n${businessName} is still waiting on a few items for ${project.name}.\n\nNeeded items:\n${missingText}${changeText}\n\nUpload or update them here:\n${packetUrl}\n\nThanks,\n${businessName}`
    };
  }

  return {
    subject: `${businessName} sent you a ProjectPacket`,
    text: `Hi ${project.clientName},\n\n${businessName} sent one upload link for ${project.name}.\n\nOpen your packet here:\n${packetUrl}\n\nThanks,\n${businessName}`
  };
}

async function sendResendEmail(input: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Email is not configured yet. Add RESEND_API_KEY and EMAIL_FROM.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? "Email provider rejected the message.");
  }
}

function activityMessageForEmail(type: EmailType, clientName: string) {
  if (type === "completion") {
    return `Completion email sent to ${clientName}.`;
  }

  if (type === "reminder") {
    return `Reminder email sent to ${clientName}.`;
  }

  return `Packet invite emailed to ${clientName}.`;
}

async function getSubscriptionForUser(
  supabase: ReturnType<typeof import("@/src/supabase/admin").createSupabaseAdmin>,
  userId: string
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id,user_id,plan,status")
    .eq("user_id", userId)
    .in("status", ["trialing", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Could not load subscription. Defaulting to free:", error.message);
  }

  return {
    id: data?.id ?? `free-${userId}`,
    userId,
    plan: ((data?.plan as Plan | null) ?? "free") as Plan,
    status: (data?.status as "trialing" | "active" | "canceled" | null) ?? "active"
  };
}
