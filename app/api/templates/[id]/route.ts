import { NextResponse } from "next/server";
import { getAuthenticatedRequestUser } from "@/src/supabase/server-auth";
import { validateTemplateBody, type TemplatePayload } from "@/src/template-validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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
    const { data: existingTemplate, error: existingError } = await supabase
      .from("templates")
      .select("id,user_id")
      .eq("id", params.id)
      .single();

    if (existingError || !existingTemplate) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    if (existingTemplate.user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this template." }, { status: 403 });
    }

    const { data: template, error: templateError } = await supabase
      .from("templates")
      .update({
        name: body.name!.trim(),
        description: body.description?.trim() ?? ""
      })
      .eq("id", existingTemplate.id)
      .select("id,user_id,name,description")
      .single();

    if (templateError || !template) {
      throw templateError ?? new Error("Could not update template.");
    }

    const { error: deleteItemsError } = await supabase
      .from("template_items")
      .delete()
      .eq("template_id", existingTemplate.id);

    if (deleteItemsError) {
      throw deleteItemsError;
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
      { error: caught instanceof Error ? caught.message : "Could not update template." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthenticatedRequestUser(request);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, user } = auth;
    const { data: existingTemplate, error: existingError } = await supabase
      .from("templates")
      .select("id,user_id")
      .eq("id", params.id)
      .single();

    if (existingError || !existingTemplate) {
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }

    if (existingTemplate.user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this template." }, { status: 403 });
    }

    const { error: deleteError } = await supabase.from("templates").delete().eq("id", existingTemplate.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ deleted: true });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Could not delete template." },
      { status: 500 }
    );
  }
}
