import { ChecklistItemStatus, ProjectStatus } from "@/src/types";
import { statusLabel } from "@/src/store";

const classes: Record<ProjectStatus | ChecklistItemStatus, string> = {
  draft: "text-ink/50 before:bg-ink/25",
  sent: "text-ink/50 before:bg-blue/50",
  in_progress: "text-ink/50 before:bg-sun/70",
  completed: "text-ink/60 before:bg-teal/70",
  overdue: "text-ink/60 before:bg-rose/70",
  requested: "text-ink/50 before:bg-ink/25",
  submitted: "text-ink/60 before:bg-blue/60",
  approved: "text-ink/60 before:bg-teal/70",
  changes_requested: "text-ink/60 before:bg-clay/70",
  waived: "text-ink/50 before:bg-stone-400"
};

export function StatusBadge({ status }: { status: ProjectStatus | ChecklistItemStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 text-xs font-medium before:block before:h-1.5 before:w-1.5 before:rounded-full ${classes[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}
