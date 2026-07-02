import { NextResponse } from "next/server";
import { getAuthenticatedRequestUser } from "@/src/supabase/server-auth";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthenticatedRequestUser(request);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, user } = auth;
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,user_id")
      .eq("id", params.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this project." }, { status: 403 });
    }

    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("file_path")
      .eq("project_id", project.id);

    if (submissionsError) {
      throw submissionsError;
    }

    const filePaths = (submissions ?? [])
      .map((submission) => submission.file_path)
      .filter((path): path is string => Boolean(path));

    if (filePaths.length) {
      const { error: storageError } = await supabase.storage
        .from("projectpacket-files")
        .remove(filePaths);

      if (storageError) {
        throw storageError;
      }
    }

    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ deleted: true });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Could not delete project." },
      { status: 500 }
    );
  }
}
