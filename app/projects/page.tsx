"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, useProjectPacket } from "@/src/store";
import { ChecklistItem, Project, ProjectPacketState } from "@/src/types";

export default function ProjectsPage() {
  const { getUserProjects, getProjectProgress, getMissingCount, state } = useProjectPacket();
  const projects = getUserProjects();
  const activeProjects = projects.filter((project) => project.status !== "completed");
  const completedProjects = projects.filter((project) => project.status === "completed");

  return (
    <AppShell>
      <PageHeader
        eyebrow="Packets"
        title="Client packets"
        description="Active handoffs stay on top. Completed packets remain available for review and downloads."
        action={<ButtonLink href="/projects/new">New packet</ButtonLink>}
      />
      <div className="grid min-w-0 gap-5 p-4 sm:p-6">
        {projects.length ? (
          <>
            {activeProjects.length ? (
              <Card className="min-w-0 overflow-hidden border-ink/10">
                <PacketTableHeader eyebrow="Open packets" title="Who owes what" />
                <div className="hidden grid-cols-[1.18fr_1.42fr_120px_128px] gap-4 border-b border-line bg-[#faf8f3] px-5 py-3 text-xs font-medium text-ink/50 lg:grid">
                  <span>Client / project</span>
                  <span>Still waiting on</span>
                  <span>Due</span>
                  <span>Next</span>
                </div>
                <div className="divide-y divide-line xl:max-h-[calc(100vh-260px)] xl:overflow-y-auto">
                  {activeProjects.map((project) => {
                    const progress = getProjectProgress(project.id);

                    return (
                      <PacketRow
                        key={project.id}
                        project={project}
                        middle={waitingSummary(project.id, state)}
                        meta={`${progress}% · ${getMissingCount(project.id)} missing`}
                        progress={progress}
                        action="Open"
                      />
                    );
                  })}
                </div>
              </Card>
            ) : (
              <EmptyState
                title="No open packets"
                description="Completed packets are saved below. Create a new packet when the next client handoff starts."
                action={<ButtonLink href="/projects/new">Create packet</ButtonLink>}
              />
            )}

            {completedProjects.length ? (
              <Card className="min-w-0 overflow-hidden border-ink/10">
                <PacketTableHeader eyebrow="Completed" title="Finished packets" />
                <div className="hidden grid-cols-[1.18fr_1.42fr_120px_128px] gap-4 border-b border-line bg-[#faf8f3] px-5 py-3 text-xs font-medium text-ink/50 lg:grid">
                  <span>Client / project</span>
                  <span>Status</span>
                  <span>Due</span>
                  <span>Next</span>
                </div>
                <div className="divide-y divide-line xl:max-h-[calc(100vh-260px)] xl:overflow-y-auto">
                  {completedProjects.map((project) => {
                    const progress = getProjectProgress(project.id);

                    return (
                      <PacketRow
                        key={project.id}
                        project={project}
                        middle="Packet marked complete"
                        meta={`${progress}% complete · does not count toward active limit`}
                        progress={progress}
                        action="Review"
                      />
                    );
                  })}
                </div>
              </Card>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="No packets yet"
            description="Create your first client packet and send one link for every asset you need."
            action={<ButtonLink href="/projects/new">Create packet</ButtonLink>}
          />
        )}
      </div>
    </AppShell>
  );
}

function PacketTableHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="border-b border-line bg-white px-5 py-5">
      <p className="text-sm font-medium text-ink/50">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
    </div>
  );
}

function PacketRow({
  project,
  middle,
  meta,
  progress,
  action
}: {
  project: Project;
  middle: string;
  meta: string;
  progress: number;
  action: string;
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group grid gap-4 px-5 py-5 transition hover:bg-[#faf8f3] lg:grid-cols-[1.18fr_1.42fr_120px_128px] lg:items-center"
    >
      <div className="min-w-0">
        <p className="font-semibold">{project.clientName}</p>
        <p className="mt-1 text-sm text-ink/50">{project.name}</p>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink/80">{middle}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
          </div>
          <p className="shrink-0 text-xs font-semibold text-ink/50">{meta}</p>
        </div>
      </div>
      <p className="text-sm text-ink/70">{formatDate(project.dueDate)}</p>
      <span className="inline-flex w-fit items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white transition group-hover:bg-teal">
        {action}
        <ArrowUpRight size={15} aria-hidden="true" />
      </span>
    </Link>
  );
}

function waitingSummary(projectId: string, state: ProjectPacketState) {
  const items = state.checklistItems
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const submitted = items.find((item) => item.status === "submitted");
  const changes = items.find((item) => item.status === "changes_requested");
  const missing = items.filter((item) => item.required && ["requested", "changes_requested"].includes(item.status));

  if (submitted) {
    return `Review ${submitted.title}`;
  }

  if (changes) {
    return `Needs a cleaner resend: ${changes.title}`;
  }

  if (missing.length) {
    return formatItemList(missing);
  }

  return "Ready for final check";
}

function formatItemList(items: ChecklistItem[]) {
  const names = items.slice(0, 3).map((item) => item.title.toLowerCase());

  if (items.length > 3) {
    return `${names.join(", ")} + ${items.length - 3} more`;
  }

  return names.join(", ");
}
