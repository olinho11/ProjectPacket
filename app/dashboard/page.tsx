"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatActivityTime } from "@/src/activity";
import { formatDate, useProjectPacket } from "@/src/store";
import { ChecklistItem, Project, ProjectPacketState } from "@/src/types";

export default function DashboardPage() {
  const {
    currentUser,
    getStats,
    getUserProjects,
    getProjectProgress,
    getMissingCount,
    state
  } = useProjectPacket();
  const stats = getStats();
  const projects = getUserProjects();
  const recentSubmissions = [...state.submissions]
    .filter((submission) => projects.some((project) => project.id === submission.projectId))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const workQueue = [...projects]
    .filter((project) => project.status !== "completed" || hasReviewItem(project.id, state))
    .sort((a, b) => queueScore(a, state) - queueScore(b, state));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Today"
        title="Client chase list"
        description={`What needs a nudge, a review, or an approval${currentUser?.businessName ? ` for ${currentUser.businessName}` : ""}.`}
        action={<ButtonLink href="/projects/new">New packet</ButtonLink>}
      />
      <div className="grid min-w-0 gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="min-w-0 overflow-hidden border-ink/10">
          <div className="flex flex-col gap-3 border-b border-line bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink/50">Queue</p>
              <h2 className="mt-2 text-xl font-semibold">Move these projects forward</h2>
              <p className="mt-1 text-sm leading-6 text-ink/60">
                The clients and items most likely to slow down your work this week.
              </p>
            </div>
            <Link href="/projects" className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:bg-paper">
              See every packet
            </Link>
          </div>
          <div className="divide-y divide-line xl:max-h-[calc(100vh-310px)] xl:overflow-y-auto">
            {workQueue.length ? (
              workQueue.map((project) => {
                const row = getQueueLine(project, state);
                const progress = getProjectProgress(project.id);

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group grid gap-4 p-5 transition hover:bg-[#faf8f3] lg:grid-cols-[minmax(0,1fr)_160px_116px] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{project.name}</p>
                      <p className="mt-2 text-sm leading-6 text-ink/70">{row.primary}</p>
                      <p className="mt-1 text-xs text-ink/50">
                        {project.clientName} · due {formatDate(project.dueDate)}
                      </p>
                    </div>
                    <div className="rounded-md border border-line bg-white p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-ink/50">Progress</span>
                        <span className="font-semibold text-ink">{progress}%</span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                        <span className="block h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-ink/50">{getMissingCount(project.id)} missing</p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition group-hover:bg-teal">
                      {row.action}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="p-5">
                <EmptyState
                  title="Nothing needs chasing"
                  description="When a client sends files, misses a required item, or needs changes, it will show up here."
                />
              </div>
            )}
          </div>
        </Card>

        <div className="grid min-w-0 gap-5 self-start">
          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Snapshot</p>
            <h2 className="mt-2 text-lg font-semibold">Right now</h2>
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
              <SummaryRow label="Open packets" value={stats.activeProjects} />
              <SummaryRow label="Assets missing" value={stats.missingAssets} />
              <SummaryRow label="Needs review" value={stats.needsAttention} />
              <SummaryRow label="Finished" value={stats.completedProjects} />
            </div>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <div className="border-b border-line p-5 pb-4">
              <p className="text-sm font-medium text-ink/50">Inbox</p>
              <h2 className="mt-2 text-lg font-semibold">Recently sent in</h2>
            </div>
            <div className="max-h-[360px] divide-y divide-line overflow-y-auto p-5">
              {recentSubmissions.length ? (
                recentSubmissions.map((submission) => {
                  const project = projects.find((candidate) => candidate.id === submission.projectId);
                  const item = state.checklistItems.find((candidate) => candidate.id === submission.checklistItemId);

                  return (
                    <div key={submission.id} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-sm font-semibold">{item?.title ?? "Submitted asset"}</p>
                      <p className="mt-1 text-xs leading-5 text-ink/50">
                        {project?.clientName ?? "Client"} · {formatActivityTime(submission.submittedAt)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-md border border-dashed border-line p-4 text-sm leading-6 text-ink/60">
                  No client submissions yet. Send a packet link and this becomes your mini inbox.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="block text-xs text-ink/50">{label}</span>
      <span className="mt-1 block text-2xl font-semibold">{value}</span>
    </div>
  );
}

function hasReviewItem(projectId: string, state: ProjectPacketState) {
  return state.checklistItems.some(
    (item) => item.projectId === projectId && ["submitted", "changes_requested"].includes(item.status)
  );
}

function queueScore(project: Project, state: ProjectPacketState) {
  if (state.checklistItems.some((item) => item.projectId === project.id && item.status === "submitted")) {
    return 0;
  }

  if (state.checklistItems.some((item) => item.projectId === project.id && item.status === "changes_requested")) {
    return 1;
  }

  if (project.status === "overdue") {
    return 2;
  }

  return new Date(project.dueDate).getTime();
}

function getQueueLine(project: Project, state: ProjectPacketState) {
  const projectItems = state.checklistItems
    .filter((item) => item.projectId === project.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const submitted = projectItems.find((item) => item.status === "submitted");
  const needsChanges = projectItems.find((item) => item.status === "changes_requested");
  const missing = projectItems.filter(
    (item) => item.required && ["requested", "changes_requested"].includes(item.status)
  );

  if (submitted) {
    return {
      primary: `${project.clientName} sent ${submitted.title}. Review it while the project is still fresh.`,
      action: "Review"
    };
  }

  if (needsChanges) {
    return {
      primary: `${project.clientName} needs to resend ${needsChanges.title}. Keep the request specific.`,
      action: "Follow up"
    };
  }

  if (missing.length) {
    return {
      primary: `${project.clientName} still owes ${formatItemList(missing)}.`,
      action: "Nudge"
    };
  }

  return {
    primary: `${project.clientName}'s packet is complete. Do a final pass before you mark it done.`,
    action: "Open"
  };
}

function formatItemList(items: ChecklistItem[]) {
  const names = items.slice(0, 2).map((item) => item.title.toLowerCase());

  if (items.length > 2) {
    return `${names.join(", ")} + ${items.length - 2} more`;
  }

  return names.join(" and ");
}
