import type { ChecklistItemStatus, ProjectStatus } from "@/src/types";

interface ProjectStatusInput {
  dueDate: string;
  currentStatus: ProjectStatus;
  items: Array<{
    required: boolean;
    status: ChecklistItemStatus;
  }>;
}

export function calculateProjectStatusFromItems(input: ProjectStatusInput): ProjectStatus {
  const requiredItems = input.items.filter((item) => item.required);
  const requiredComplete =
    requiredItems.length > 0 &&
    requiredItems.every((item) => ["approved", "waived"].includes(item.status));

  if (input.currentStatus === "completed" && requiredComplete) {
    return "completed";
  }

  if (
    new Date(input.dueDate) < startOfToday() &&
    requiredItems.some((item) => ["requested", "changes_requested"].includes(item.status))
  ) {
    return "overdue";
  }

  if (input.items.some((item) => item.status !== "requested")) {
    return "in_progress";
  }

  return input.currentStatus === "draft" ? "draft" : "sent";
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
