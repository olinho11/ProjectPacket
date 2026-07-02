import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateProjectStatusFromItems } from "@/src/project-status";
import type { ChecklistItemStatus, ProjectStatus } from "@/src/types";

export async function recalculateStoredProjectStatus(
  supabase: SupabaseClient,
  project: { id: string; due_date: string; status: string }
) {
  const { data: items, error } = await supabase
    .from("checklist_items")
    .select("required,status")
    .eq("project_id", project.id);

  if (error) {
    throw error;
  }

  const status = calculateProjectStatusFromItems({
    dueDate: project.due_date,
    currentStatus: project.status as ProjectStatus,
    items: (items ?? []).map((item) => ({
      required: Boolean(item.required),
      status: item.status as ChecklistItemStatus
    }))
  });

  const { error: updateError } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", project.id);

  if (updateError) {
    throw updateError;
  }

  return status;
}
