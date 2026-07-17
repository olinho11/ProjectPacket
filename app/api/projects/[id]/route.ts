import { NextResponse } from "next/server";
import { hashPacketPasscode } from "@/src/passcode";
import { getAuthenticatedRequestUser } from "@/src/supabase/server-auth";

export const dynamic = "force-dynamic";

interface PatchProjectBody {
  status?: "completed" | "in_progress";
  name?: string;
  clientName?: string;
  clientEmail?: string;
  dueDate?: string;
  accessPasscode?: string;
  clearPasscode?: boolean;
  expiresAt?: string | null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthenticatedRequestUser(request);

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as PatchProjectBody;

    const { supabase, user } = auth;
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id,user_id,client_name,client_email,name,due_date,status,token,access_passcode_hash,expires_at,created_at")
      .eq("id", params.id)
      .single();

    if (projectError && isMissingAccessColumnError(projectError.message)) {
      return NextResponse.json(
        { error: "Packet access needs the latest Supabase SQL. Run supabase-plan-limits.sql, then try again." },
        { status: 500 }
      );
    }

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: "You do not have access to this project." }, { status: 403 });
    }

    if (body.status) {
      if (body.status !== "completed" && body.status !== "in_progress") {
        return NextResponse.json({ error: "Choose a valid packet status." }, { status: 400 });
      }

      const { data: items, error: itemsError } = await supabase
        .from("checklist_items")
        .select("required,status")
        .eq("project_id", project.id);

      if (itemsError) {
        throw itemsError;
      }

      if (body.status === "completed") {
        const requiredItems = (items ?? []).filter((item) => Boolean(item.required));
        const readyToComplete =
          requiredItems.length > 0 &&
          requiredItems.every((item) => ["approved", "waived"].includes(String(item.status)));

        if (!readyToComplete) {
          return NextResponse.json(
            { error: "Approve or waive every required item before marking this packet complete." },
            { status: 400 }
          );
        }
      }

      const nextStatus = body.status;
      const timestamp = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("projects")
        .update({ status: nextStatus })
        .eq("id", project.id);

      if (updateError) {
        throw updateError;
      }

      const message =
        nextStatus === "completed"
          ? `Marked ${project.name} complete.`
          : `Reopened ${project.name}.`;
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
        console.warn("Packet status saved, but activity log did not save:", logError.message);
      }

      return NextResponse.json({
        projectStatus: nextStatus,
        log: log
          ? {
              id: log.id,
              projectId: log.project_id,
              message: log.message,
              createdAt: log.created_at
            }
          : null
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(body, "accessPasscode") ||
      Object.prototype.hasOwnProperty.call(body, "clearPasscode") ||
      Object.prototype.hasOwnProperty.call(body, "expiresAt")
    ) {
      const update: Record<string, string | null> = {};

      if (body.clearPasscode) {
        update.access_passcode_hash = null;
      } else if (typeof body.accessPasscode === "string" && body.accessPasscode.trim()) {
        if (body.accessPasscode.trim().length < 4 || body.accessPasscode.trim().length > 32) {
          return NextResponse.json(
            { error: "Use a passcode between 4 and 32 characters." },
            { status: 400 }
          );
        }

        update.access_passcode_hash = hashPacketPasscode(body.accessPasscode);
      }

      if (Object.prototype.hasOwnProperty.call(body, "expiresAt")) {
        update.expires_at = body.expiresAt || null;
      }

      const timestamp = new Date().toISOString();
      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update(update)
        .eq("id", project.id)
        .select("id,user_id,client_name,client_email,name,due_date,status,token,access_passcode_hash,expires_at,created_at")
        .single();

    if (updateError || !updatedProject) {
        if (updateError && isMissingAccessColumnError(updateError.message)) {
          return NextResponse.json(
            { error: "Packet access needs the latest Supabase SQL. Run supabase-plan-limits.sql, then try again." },
            { status: 500 }
          );
        }

        throw updateError ?? new Error("Could not update packet access.");
      }

      const { data: log, error: logError } = await supabase
        .from("activity_logs")
        .insert({
          project_id: project.id,
          message: "Updated client link access.",
          created_at: timestamp
        })
        .select("id,project_id,message,created_at")
        .single();

      if (logError) {
        console.warn("Packet access saved, but activity log did not save:", logError.message);
      }

      return NextResponse.json({
        project: projectFromRow(updatedProject),
        log: log
          ? {
              id: log.id,
              projectId: log.project_id,
              message: log.message,
              createdAt: log.created_at
            }
          : null
      });
    }

    const validationError = validateProjectDetailsBody(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const { data: updatedProject, error: updateError } = await supabase
      .from("projects")
      .update({
        name: body.name!.trim(),
        client_name: body.clientName!.trim(),
        client_email: body.clientEmail!.trim().toLowerCase(),
        due_date: body.dueDate!
      })
      .eq("id", project.id)
      .select("id,user_id,client_name,client_email,name,due_date,status,token,access_passcode_hash,expires_at,created_at")
      .single();

    if (updateError || !updatedProject) {
      throw updateError ?? new Error("Could not update packet details.");
    }

    const { data: log, error: logError } = await supabase
      .from("activity_logs")
      .insert({
        project_id: project.id,
        message: "Updated packet details.",
        created_at: timestamp
      })
      .select("id,project_id,message,created_at")
      .single();

    if (logError) {
      console.warn("Packet details saved, but activity log did not save:", logError.message);
    }

    return NextResponse.json({
      project: projectFromRow(updatedProject),
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
      { error: caught instanceof Error ? caught.message : "Could not update packet." },
      { status: 500 }
    );
  }
}

function isMissingAccessColumnError(message: string) {
  return message.includes("access_passcode_hash") || message.includes("expires_at");
}

function projectFromRow(project: {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string;
  name: string;
  due_date: string;
  status: string;
  token: string;
  access_passcode_hash?: string | null;
  expires_at?: string | null;
  created_at: string;
}) {
  return {
    id: project.id,
    userId: project.user_id,
    clientName: project.client_name,
    clientEmail: project.client_email,
    name: project.name,
    dueDate: project.due_date,
    status: project.status,
    token: project.token,
    hasPasscode: Boolean(project.access_passcode_hash),
    expiresAt: project.expires_at ?? null,
    createdAt: project.created_at
  };
}

function validateProjectDetailsBody(body: PatchProjectBody) {
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

  return "";
}

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
