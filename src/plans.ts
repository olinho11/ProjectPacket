import type { Plan, ProjectStatus } from "@/src/types";

export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = ["draft", "sent", "in_progress", "overdue"];

export const PLAN_LIMITS: Record<Plan, number | null> = {
  free: 1,
  starter: 5,
  pro: 25,
  agency: null
};

export const PLAN_LIMIT_MESSAGE =
  "Free includes 1 active packet. Upgrade to Starter to manage up to 5 active packets.";

export function getPlanLimit(plan: Plan | undefined | null) {
  return PLAN_LIMITS[plan ?? "free"];
}

export function isActiveProjectStatus(status: ProjectStatus) {
  return ACTIVE_PROJECT_STATUSES.includes(status);
}

export function formatPlanLimit(plan: Plan | undefined | null) {
  const limit = getPlanLimit(plan);
  return limit === null ? "Unlimited active packets" : `${limit} active packet${limit === 1 ? "" : "s"}`;
}
