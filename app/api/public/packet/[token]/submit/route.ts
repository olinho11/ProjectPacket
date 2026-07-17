import { NextResponse } from "next/server";
import { validateCreativeAssetFile } from "@/src/file-safety";
import { isPacketExpired, verifyPacketPasscode } from "@/src/passcode";
import { validateSubmissionLengths } from "@/src/submission-limits";
import { createSupabaseAdmin } from "@/src/supabase/admin";
import { recalculateStoredProjectStatus } from "@/src/supabase/project-status";

export const dynamic = "force-dynamic";

interface SubmitBody {
  itemId?: string;
  fileName?: string;
  fileDataUrl?: string;
  textValue?: string;
  linkValue?: string;
  approvedValue?: boolean;
  clientComment?: string;
  acceptedCreativeAssetOnly?: boolean;
  passcode?: string;
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const body = (await request.json()) as SubmitBody;

    if (!body.itemId) {
      return NextResponse.json({ error: "Missing checklist item." }, { status: 400 });
    }

    if (!body.acceptedCreativeAssetOnly) {
      return NextResponse.json(
        { error: "Please confirm this packet is for creative project assets before submitting." },
        { status: 400 }
      );
    }

    const lengthError = validateSubmissionLengths(body);

    if (lengthError) {
      return NextResponse.json({ error: lengthError }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,user_id,client_name,token,due_date,status,access_passcode_hash,expires_at")
      .eq("token", params.token)
      .single();

    if (projectError && isMissingAccessColumnError(projectError.message)) {
      return NextResponse.json(
        { error: "This packet link needs the latest ProjectPacket database update before passcodes and expiration can work." },
        { status: 500 }
      );
    }

    if (projectError || !project) {
      return NextResponse.json({ error: "Upload link not found." }, { status: 404 });
    }

    if (isPacketExpired(project.expires_at)) {
      return NextResponse.json(
        { error: "This packet link has expired. Ask your freelancer for a fresh link." },
        { status: 410 }
      );
    }

    if (!verifyPacketPasscode(body.passcode, project.access_passcode_hash)) {
      return NextResponse.json(
        { error: "Enter the packet passcode to continue.", requiresPasscode: true },
        { status: 401 }
      );
    }

    if (project.status === "completed") {
      return NextResponse.json({ error: "This packet is complete." }, { status: 409 });
    }

    const { data: item, error: itemError } = await supabase
      .from("checklist_items")
      .select("id,project_id,title,type,status")
      .eq("id", body.itemId)
      .eq("project_id", project.id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
    }

    if (item.status === "approved") {
      return NextResponse.json(
        { error: "This item was already approved. No new upload is needed." },
        { status: 409 }
      );
    }

    if (item.status === "waived") {
      return NextResponse.json(
        { error: "This item is no longer needed." },
        { status: 409 }
      );
    }

    let filePath: string | null = null;
    const hasFileInput = Boolean(body.fileName || body.fileDataUrl);

    if (hasFileInput && item.type !== "file") {
      return NextResponse.json({ error: "This checklist item does not accept file uploads." }, { status: 400 });
    }

    if (item.type === "file" && (!body.fileName || !body.fileDataUrl)) {
      return NextResponse.json({ error: "Choose a file before saving this item." }, { status: 400 });
    }

    if (item.type === "approval" && !body.approvedValue) {
      return NextResponse.json({ error: "Check the approval box before saving this item." }, { status: 400 });
    }

    if (body.fileName && body.fileDataUrl) {
      let file: ReturnType<typeof dataUrlToFile>;

      try {
        file = dataUrlToFile(body.fileDataUrl);
      } catch {
        return NextResponse.json({ error: "Could not read that file. Try uploading it again." }, { status: 400 });
      }

      const validation = validateCreativeAssetFile({
        fileName: body.fileName,
        size: file.buffer.byteLength,
        contentType: file.contentType
      });

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
      filePath = `${project.user_id}/${project.id}/${item.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("projectpacket-files")
        .upload(filePath, file.buffer, {
          contentType: file.contentType,
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }
    }

    const { data: previousSubmission } = await supabase
      .from("submissions")
      .select("file_path")
      .eq("checklist_item_id", item.id)
      .maybeSingle();

    const submittedAt = new Date().toISOString();
    const submissionInsert = {
      project_id: project.id,
      checklist_item_id: item.id,
      file_name: body.fileName || null,
      file_path: filePath,
      text_value: body.textValue || null,
      link_value: body.linkValue || null,
      approved_value: body.approvedValue ?? null,
      accepted_creative_asset_only: Boolean(body.acceptedCreativeAssetOnly),
      accepted_creative_asset_only_at: submittedAt,
      client_comment: body.clientComment || "",
      submitted_at: submittedAt
    };

    let { data: submission, error: submissionError } = await supabase
      .from("submissions")
      .upsert(submissionInsert, { onConflict: "checklist_item_id" })
      .select("id,project_id,checklist_item_id,file_name,file_path,text_value,link_value,approved_value,accepted_creative_asset_only,accepted_creative_asset_only_at,client_comment,submitted_at")
      .single();

    if (submissionError?.message?.includes("accepted_creative_asset_only")) {
      const fallbackInsert = {
        project_id: submissionInsert.project_id,
        checklist_item_id: submissionInsert.checklist_item_id,
        file_name: submissionInsert.file_name,
        file_path: submissionInsert.file_path,
        text_value: submissionInsert.text_value,
        link_value: submissionInsert.link_value,
        approved_value: submissionInsert.approved_value,
        client_comment: submissionInsert.client_comment,
        submitted_at: submissionInsert.submitted_at
      };

      const fallbackResult = await supabase
        .from("submissions")
        .upsert(fallbackInsert, { onConflict: "checklist_item_id" })
        .select("id,project_id,checklist_item_id,file_name,file_path,text_value,link_value,approved_value,client_comment,submitted_at")
        .single();

      submission = fallbackResult.data
        ? {
            ...fallbackResult.data,
            accepted_creative_asset_only: Boolean(body.acceptedCreativeAssetOnly),
            accepted_creative_asset_only_at: submittedAt
          }
        : null;
      submissionError = fallbackResult.error;
    }

    if (submissionError || !submission) {
      throw submissionError ?? new Error("Could not save submission.");
    }

    if (previousSubmission?.file_path && previousSubmission.file_path !== filePath) {
      const { error: removePreviousError } = await supabase.storage
        .from("projectpacket-files")
        .remove([previousSubmission.file_path]);

      if (removePreviousError) {
        console.warn("Submission saved, but old file did not delete:", removePreviousError.message);
      }
    }

    const { error: itemUpdateError } = await supabase
      .from("checklist_items")
      .update({
        status: "submitted",
        change_request_note: ""
      })
      .eq("id", item.id);

    if (itemUpdateError) {
      throw itemUpdateError;
    }

    const { error: logError } = await supabase.from("activity_logs").insert({
      project_id: project.id,
      message: `${project.client_name} submitted ${item.title}.`,
      created_at: submittedAt
    });

    if (logError) {
      console.warn("Submission saved, but activity log did not save:", logError.message);
    }

    const projectStatus = await recalculateStoredProjectStatus(supabase, project);

    return NextResponse.json({
      projectStatus,
      submission: {
        id: submission.id,
        projectId: submission.project_id,
        checklistItemId: submission.checklist_item_id,
        fileName: submission.file_name ?? undefined,
        filePath: submission.file_path ?? undefined,
        textValue: submission.text_value ?? undefined,
        linkValue: submission.link_value ?? undefined,
        approvedValue: submission.approved_value ?? undefined,
        acceptedCreativeAssetOnly: submission.accepted_creative_asset_only ?? Boolean(body.acceptedCreativeAssetOnly),
        acceptedCreativeAssetOnlyAt: submission.accepted_creative_asset_only_at ?? submittedAt,
        clientComment: submission.client_comment,
        submittedAt: submission.submitted_at
      }
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Could not save submission." },
      { status: 500 }
    );
  }
}

function dataUrlToFile(dataUrl: string) {
  const [meta, rawBase64] = dataUrl.split(",");
  const contentType = meta.match(/^data:(.*?);base64$/)?.[1] || "application/octet-stream";

  if (!meta.startsWith("data:") || !rawBase64) {
    throw new Error("Invalid file data.");
  }

  return {
    buffer: Buffer.from(rawBase64 ?? "", "base64"),
    contentType
  };
}

function isMissingAccessColumnError(message: string) {
  return message.includes("access_passcode_hash") || message.includes("expires_at");
}
