import { NextResponse } from "next/server";
import { getPlanLimit, PLAN_LIMIT_MESSAGE } from "@/src/plans";
import { getAuthenticatedRequestUser } from "@/src/supabase/server-auth";
import type { ChecklistItemType, Plan } from "@/src/types";

export const dynamic = "force-dynamic";

interface CreateProjectBody {
  name?: string;
  clientName?: string;
  clientEmail?: string;
  dueDate?: string;
  items?: Array<{
    title?: string;
    description?: string;
    type?: ChecklistItemType;
    required?: boolean;
  }>;
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedRequestUser(request);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as CreateProjectBody;
    const validationError = validateProjectBody(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { supabase, user } = auth;
    const subscription = await getSubscriptionForUser(supabase, user.id);
    const planLimit = getPlanLimit(subscription.plan);

    if (planLimit !== null) {
      const { count, error: countError } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        throw countError;
      }

      if ((count ?? 0) >= planLimit) {
        return NextResponse.json({ error: PLAN_LIMIT_MESSAGE }, { status: 403 });
      }
    }

    const timestamp = new Date().toISOString();
    const projectId = crypto.randomUUID();
    const projectInsert = {
      id: projectId,
      user_id: user.id,
      client_name: body.clientName!.trim(),
      client_email: body.clientEmail!.trim().toLowerCase(),
      name: body.name!.trim(),
      due_date: body.dueDate!,
      status: "sent",
      token: generateToken(),
      created_at: timestamp
    };

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert(projectInsert)
      .select("id,user_id,client_name,client_email,name,due_date,status,token,access_passcode_hash,expires_at,created_at")
      .single();

    if (projectError || !project) {
      if (projectError?.message?.includes("packet slot") || projectError?.message?.includes("active packet")) {
        return NextResponse.json({ error: PLAN_LIMIT_MESSAGE }, { status: 403 });
      }

      throw projectError ?? new Error("Could not save project.");
    }

    const itemsToInsert = body.items!.map((item, index) => ({
      id: crypto.randomUUID(),
      project_id: project.id,
      title: item.title!.trim(),
      description: item.description?.trim() ?? "",
      type: item.type!,
      required: item.required ?? true,
      status: "requested",
      sort_order: index + 1,
      change_request_note: "",
      created_at: timestamp
    }));

    const { data: items, error: itemsError } = await supabase
      .from("checklist_items")
      .insert(itemsToInsert)
      .select("id,project_id,title,description,type,required,status,sort_order,change_request_note,created_at");

    if (itemsError || !items) {
      await supabase.from("projects").delete().eq("id", project.id);
      throw itemsError ?? new Error("Could not save checklist items.");
    }

    const logsToInsert = [
      {
        project_id: project.id,
        message: `Created ${project.name} for ${project.client_name}.`,
        created_at: timestamp
      },
      {
        project_id: project.id,
        message: "Client upload link is ready to send.",
        created_at: timestamp
      }
    ];

    const { data: logs, error: logsError } = await supabase
      .from("activity_logs")
      .insert(logsToInsert)
      .select("id,project_id,message,created_at");

    if (logsError) {
      console.warn("Project saved, but activity logs did not save:", logsError.message);
    }

    return NextResponse.json({
      project: {
        id: project.id,
        userId: project.user_id,
        clientName: project.client_name,
        clientEmail: project.client_email,
        name: project.name,
        dueDate: project.due_date,
        status: project.status,
        token: project.token,
        hasPasscode: Boolean(project.access_passcode_hash),
        expiresAt: project.expires_at,
        createdAt: project.created_at
      },
      items: items.map((item) => ({
        id: item.id,
        projectId: item.project_id,
        title: item.title,
        description: item.description,
        type: item.type,
        required: item.required,
        status: item.status,
        sortOrder: item.sort_order,
        changeRequestNote: item.change_request_note,
        createdAt: item.created_at
      })),
      logs: (logs ?? []).map((log) => ({
        id: log.id,
        projectId: log.project_id,
        message: log.message,
        createdAt: log.created_at
      })),
      subscription
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Could not create project." },
      { status: 500 }
    );
  }
}

function validateProjectBody(body: CreateProjectBody) {
  if (!body.name?.trim()) {
    return "Add a project name.";
  }

  if (!body.clientName?.trim()) {
    return "Add a client name.";
  }

  if (!body.clientEmail?.trim()) {
    return "Add a client email.";
  }

  if (!body.dueDate) {
    return "Add a due date.";
  }

  if (!body.items?.length) {
    return "Add at least one checklist item.";
  }

  const validTypes: ChecklistItemType[] = ["file", "text", "link", "approval"];
  const invalidItem = body.items.find((item) => !item.title?.trim() || !item.type || !validTypes.includes(item.type));

  if (invalidItem) {
    return "Every checklist item needs a title and type.";
  }

  return "";
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

function generateToken() {
  return `packet_${crypto.randomUUID().replace(/-/g, "")}`;
}
