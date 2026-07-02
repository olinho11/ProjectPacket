import { NextResponse } from "next/server";
import { recalculateStoredProjectStatus } from "@/src/supabase/project-status";
import { getAuthenticatedRequestUser } from "@/src/supabase/server-auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthenticatedRequestUser(request);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, user } = auth;
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id,project_id,checklist_item_id,file_path")
      .eq("id", params.id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,user_id,due_date,status")
      .eq("id", submission.project_id)
      .single();

    if (projectError || !project || project.user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this submission." }, { status: 403 });
    }

    const { data: item, error: itemError } = await supabase
      .from("checklist_items")
      .select("id,title")
      .eq("id", submission.checklist_item_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
    }

    if (submission.file_path) {
      const { error: storageError } = await supabase.storage
        .from("projectpacket-files")
        .remove([submission.file_path]);

      if (storageError) {
        throw storageError;
      }
    }

    const { error: deleteError } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submission.id);

    if (deleteError) {
      throw deleteError;
    }

    const { error: itemUpdateError } = await supabase
      .from("checklist_items")
      .update({
        status: "requested",
        change_request_note: ""
      })
      .eq("id", item.id);

    if (itemUpdateError) {
      throw itemUpdateError;
    }

    const message = `Deleted submission for ${item.title}.`;
    const { error: logError } = await supabase.from("activity_logs").insert({
      project_id: submission.project_id,
      message,
      created_at: new Date().toISOString()
    });

    if (logError) {
      console.warn("Submission deleted, but activity log did not save:", logError.message);
    }

    const projectStatus = await recalculateStoredProjectStatus(supabase, project);

    return NextResponse.json({
      deleted: true,
      projectId: submission.project_id,
      checklistItemId: item.id,
      projectStatus,
      message
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Could not delete submission." },
      { status: 500 }
    );
  }
}
