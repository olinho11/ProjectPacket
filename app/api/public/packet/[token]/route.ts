import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/supabase/admin";

export const dynamic = "force-dynamic";

interface SubmissionRow {
  id: string;
  project_id: string;
  checklist_item_id: string;
  file_name: string | null;
  file_path: string | null;
  text_value: string | null;
  link_value: string | null;
  approved_value: boolean | null;
  accepted_creative_asset_only?: boolean | null;
  accepted_creative_asset_only_at?: string | null;
  client_comment: string;
  submitted_at: string;
}

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = createSupabaseAdmin();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,user_id,client_name,client_email,name,due_date,status,token,created_at")
      .eq("token", params.token)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Upload link not found." }, { status: 404 });
    }

    const [profileResult, itemsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,name,email,business_name,brand_color,created_at")
        .eq("id", project.user_id)
        .maybeSingle(),
      supabase
        .from("checklist_items")
        .select("id,project_id,title,description,type,required,status,sort_order,change_request_note,created_at")
        .eq("project_id", project.id)
        .order("sort_order", { ascending: true })
    ]);
    const submissionsResult = await loadSubmissions(supabase, project.id);

    if (itemsResult.error) {
      throw itemsResult.error;
    }

    if (submissionsResult.error) {
      throw submissionsResult.error;
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
        createdAt: project.created_at
      },
      user: profileResult.data
        ? {
            id: profileResult.data.id,
            name: profileResult.data.name,
            email: profileResult.data.email,
            businessName: profileResult.data.business_name,
            brandColor: profileResult.data.brand_color,
            createdAt: profileResult.data.created_at
          }
        : null,
      items: (itemsResult.data ?? []).map((item) => ({
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
      submissions: ((submissionsResult.data ?? []) as SubmissionRow[]).map((submission) => ({
        id: submission.id,
        projectId: submission.project_id,
        checklistItemId: submission.checklist_item_id,
        fileName: submission.file_name ?? undefined,
        filePath: submission.file_path ?? undefined,
        textValue: submission.text_value ?? undefined,
        linkValue: submission.link_value ?? undefined,
        approvedValue: submission.approved_value ?? undefined,
        acceptedCreativeAssetOnly: submission.accepted_creative_asset_only ?? undefined,
        acceptedCreativeAssetOnlyAt: submission.accepted_creative_asset_only_at ?? undefined,
        clientComment: submission.client_comment,
        submittedAt: submission.submitted_at
      }))
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Could not load packet." },
      { status: 500 }
    );
  }
}

async function loadSubmissions(supabase: ReturnType<typeof createSupabaseAdmin>, projectId: string) {
  const result = await supabase
    .from("submissions")
    .select("id,project_id,checklist_item_id,file_name,file_path,text_value,link_value,approved_value,accepted_creative_asset_only,accepted_creative_asset_only_at,client_comment,submitted_at")
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: false });

  if (!result.error || !result.error.message.includes("accepted_creative_asset_only")) {
    return result;
  }

  return supabase
    .from("submissions")
    .select("id,project_id,checklist_item_id,file_name,file_path,text_value,link_value,approved_value,client_comment,submitted_at")
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: false });
}
