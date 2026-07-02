import { NextResponse } from "next/server";
import { getAuthenticatedRequestUser } from "@/src/supabase/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Missing file path." }, { status: 400 });
    }

    const auth = await getAuthenticatedRequestUser(request);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, user } = auth;
    const { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .select("id,project_id,file_path")
      .eq("file_path", path)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,user_id")
      .eq("id", submission.project_id)
      .single();

    if (projectError || !project || project.user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this file." }, { status: 403 });
    }

    const { data, error } = await supabase.storage
      .from("projectpacket-files")
      .createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      throw error ?? new Error("Could not sign file URL.");
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Could not open file." },
      { status: 500 }
    );
  }
}
