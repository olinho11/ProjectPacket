import { NextResponse } from "next/server";
import { getCustomTemplateLimit, TEMPLATE_LIMIT_MESSAGE } from "@/src/plans";
import { getAuthenticatedRequestUser } from "@/src/supabase/server-auth";
import { validateTemplateBody, type TemplatePayload } from "@/src/template-validation";
import type { Plan } from "@/src/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedRequestUser(request);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as TemplatePayload;
    const validationError = validateTemplateBody(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { supabase, user } = auth;
    const subscription = await getSubscriptionForUser(supabase, user.id);
    const templateLimit = getCustomTemplateLimit(subscription.plan);

    if (templateLimit !== null) {
      const { count, error: countError } = await supabase
        .from("templates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        throw countError;
      }

      if ((count ?? 0) >= templateLimit) {
        return NextResponse.json({ error: TEMPLATE_LIMIT_MESSAGE }, { status: 403 });
      }
    }

    const templateId = crypto.randomUUID();
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .insert({
        id: templateId,
        user_id: user.id,
        name: body.name!.trim(),
        description: body.description?.trim() ?? ""
      })
      .select("id,user_id,name,description")
      .single();

    if (templateError || !template) {
      if (templateError?.message?.includes("custom template")) {
        return NextResponse.json({ error: TEMPLATE_LIMIT_MESSAGE }, { status: 403 });
      }

      throw templateError ?? new Error("Could not save template.");
    }

    const itemsToInsert = body.items!.map((item, index) => ({
      id: crypto.randomUUID(),
      template_id: template.id,
      title: item.title!.trim(),
      description: item.description?.trim() ?? "",
      type: item.type!,
      required: item.required ?? true,
      sort_order: index + 1
    }));

    const { data: items, error: itemsError } = await supabase
      .from("template_items")
      .insert(itemsToInsert)
      .select("id,template_id,title,description,type,required,sort_order");

    if (itemsError || !items) {
      await supabase.from("templates").delete().eq("id", template.id);
      throw itemsError ?? new Error("Could not save template items.");
    }

    return NextResponse.json({
      template: {
        id: template.id,
        userId: template.user_id,
        name: template.name,
        description: template.description,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          type: item.type,
          required: item.required,
          sortOrder: item.sort_order
        }))
      }
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Could not save template." },
      { status: 500 }
    );
  }
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
    plan: ((data?.plan as Plan | null) ?? "free") as Plan
  };
}
