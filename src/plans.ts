import type { Plan, ProjectStatus } from "@/src/types";

export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = ["draft", "sent", "in_progress", "overdue"];

export const PLAN_LIMITS: Record<Plan, number | null> = {
  free: 1,
  starter: 5,
  pro: 25,
  agency: null
};

export const CUSTOM_TEMPLATE_LIMITS: Record<Plan, number | null> = {
  free: 2,
  starter: null,
  pro: null,
  agency: null
};

export const PLAN_LIMIT_MESSAGE =
  "Free includes 1 packet slot. Delete a packet to free the slot, or upgrade for more.";
export const TEMPLATE_LIMIT_MESSAGE =
  "Free includes 2 custom templates. Upgrade for unlimited templates.";
export const EMAIL_UPGRADE_MESSAGE =
  "Client email sending is included on Starter and above. Upgrade to send packet links and reminders by email.";

export function getPlanLimit(plan: Plan | undefined | null) {
  return PLAN_LIMITS[plan ?? "free"];
}

export function getCustomTemplateLimit(plan: Plan | undefined | null) {
  return CUSTOM_TEMPLATE_LIMITS[plan ?? "free"];
}

export function isActiveProjectStatus(status: ProjectStatus) {
  return ACTIVE_PROJECT_STATUSES.includes(status);
}

export function canUseClientEmail(plan: Plan | undefined | null) {
  return (plan ?? "free") !== "free";
}

export function formatPlanLimit(plan: Plan | undefined | null) {
  const limit = getPlanLimit(plan);
  return limit === null ? "Unlimited packet slots" : `${limit} packet slot${limit === 1 ? "" : "s"}`;
}

export function formatCustomTemplateLimit(plan: Plan | undefined | null) {
  const limit = getCustomTemplateLimit(plan);
  return limit === null ? "Unlimited custom templates" : `${limit} custom template${limit === 1 ? "" : "s"}`;
}
