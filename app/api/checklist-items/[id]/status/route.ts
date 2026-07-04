import { NextResponse } from "next/server";
import { recalculateStoredProjectStatus } from "@/src/supabase/project-status";
import { getAuthenticatedRequestUser } from "@/src/supabase/server-auth";
import type { ChecklistItemStatus } from "@/src/types";

export const dynamic = "force-dynamic";

interface StatusBody {
  status?: ChecklistItemStatus;
  changeRequestNote?: string;
}

const allowedStatuses: ChecklistItemStatus[] = [
  "requested",
  "submitted",
  "approved",
  "changes_requested",
  "waived"
];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthenticatedRequestUser(request);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as StatusBody;

    if (!body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Choose a valid item status." }, { status: 400 });
    }

    if (body.status === "changes_requested" && !body.changeRequestNote?.trim()) {
      return NextResponse.json({ error: "Add a note before requesting changes." }, { status: 400 });
    }

    const { supabase, user } = auth;
    const { data: item, error: itemError } = await supabase
      .from("checklist_items")
      .select("id,project_id,title")
      .eq("id", params.id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,user_id,due_date,status")
      .eq("id", item.project_id)
      .single();

    if (projectError || !project || project.user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this item." }, { status: 403 });
    }

    const note = body.status === "changes_requested" ? body.changeRequestNote?.trim() ?? "" : "";
    const { data: updatedItem, error: updateError } = await supabase
      .from("checklist_items")
      .update({
        status: body.status,
        change_request_note: note
      })
      .eq("id", item.id)
      .select("id,project_id,title,description,type,required,status,sort_order,change_request_note,created_at")
      .single();

    if (updateError || !updatedItem) {
      throw updateError ?? new Error("Could not update item.");
    }

    const message = activityForStatus(item.title, body.status);
    const { data: log, error: logError } = await supabase
      .from("activity_logs")
      .insert({
        project_id: item.project_id,
        message,
        created_at: new Date().toISOString()
      })
      .select("id,project_id,message,created_at")
      .single();

    if (logError) {
      console.warn("Status saved, but activity log did not save:", logError.message);
    }

    const nextProjectStatus = await recalculateStoredProjectStatus(supabase, project);

    return NextResponse.json({
      item: {
        id: updatedItem.id,
        projectId: updatedItem.project_id,
        title: updatedItem.title,
        description: updatedItem.description,
        type: updatedItem.type,
        required: updatedItem.required,
        status: updatedItem.status,
        sortOrder: updatedItem.sort_order,
        changeRequestNote: updatedItem.change_request_note,
        createdAt: updatedItem.created_at
      },
      projectStatus: nextProjectStatus,
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
      { error: caught instanceof Error ? caught.message : "Could not update item status." },
      { status: 500 }
    );
  }
}

function activityForStatus(title: string, status: ChecklistItemStatus) {
  if (status === "approved") {
    return `Approved ${title}.`;
  }

  if (status === "changes_requested") {
    return `Requested changes for ${title}.`;
  }

  if (status === "waived") {
    return `Waived ${title}.`;
  }

  return `Updated ${title} to ${status}.`;
}
