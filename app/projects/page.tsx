"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FolderOpen, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, useProjectPacket } from "@/src/store";
import { ChecklistItem, Project, ProjectPacketState } from "@/src/types";

type Filter = "active" | "completed" | "all";

export default function ProjectsPage() {
  const { getUserProjects, getProjectProgress, getMissingCount, state } = useProjectPacket();
  const projects = getUserProjects();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const visibleProjects = useMemo(() => projects.filter((project) => {
    const matchesFilter = filter === "all" || (filter === "completed" ? project.status === "completed" : project.status !== "completed");
    const haystack = `${project.name} ${project.clientName} ${project.clientEmail}`.toLowerCase();
    return matchesFilter && haystack.includes(query.trim().toLowerCase());
  }), [filter, projects, query]);

  return (
    <AppShell>
      <PageHeader eyebrow="Packets" title="Client packets" description="Every active handoff, the next missing item, and exactly where to follow up." action={<ButtonLink href="/projects/new"><Plus size={16} />New packet</ButtonLink>} />
      <div className="grid min-w-0 gap-5 p-4 sm:p-6">
        <section className="overflow-hidden rounded-md border border-line bg-white">
          <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex w-fit rounded-md bg-ink/[0.055] p-1">
              {(["active", "completed", "all"] as Filter[]).map((value) => (
                <button key={value} onClick={() => setFilter(value)} className={`min-h-8 rounded-md px-3 text-xs font-semibold capitalize transition ${filter === value ? "bg-white text-ink shadow-[0_1px_2px_rgba(23,25,22,0.08)]" : "text-ink/48 hover:text-ink"}`}>{value}</button>
              ))}
            </div>
            <label className="relative block w-full md:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-ink/35" size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="focus-ring min-h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm placeholder:text-ink/35" placeholder="Search packets" />
            </label>
          </div>

          <div className="hidden grid-cols-[1.25fr_1.15fr_120px_100px_40px] gap-4 border-b border-line bg-[#f8f9f6] px-5 py-2.5 text-[11px] font-semibold text-ink/38 lg:grid">
            <span>Client and project</span><span>Next action</span><span>Due</span><span>Progress</span><span />
          </div>

          {visibleProjects.length ? (
            <div className="divide-y divide-line">
              {visibleProjects.map((project) => (
                <PacketRow key={project.id} project={project} summary={waitingSummary(project.id, state)} progress={getProjectProgress(project.id)} missing={getMissingCount(project.id)} />
              ))}
            </div>
          ) : (
            <div className="p-5"><EmptyState title={projects.length ? "No matching packets" : "Your packet list is empty"} description={projects.length ? "Try another search or change the filter." : "Create a packet for a real client handoff and keep every requested asset in one place."} action={!projects.length ? <ButtonLink href="/projects/new">Create packet</ButtonLink> : undefined} /></div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function PacketRow({ project, summary, progress, missing }: { project: Project; summary: string; progress: number; missing: number }) {
  const isComplete = project.status === "completed";
  return (
    <Link href={`/projects/${project.id}`} className="group grid gap-4 px-5 py-4 transition hover:bg-[#fafbf8] lg:grid-cols-[1.25fr_1.15fr_120px_100px_40px] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${isComplete ? "bg-teal/[0.09] text-teal" : "bg-blue/[0.09] text-blue"}`}><FolderOpen size={18} strokeWidth={1.8} /></span>
        <div className="min-w-0"><p className="truncate font-semibold">{project.clientName}</p><p className="mt-0.5 truncate text-sm text-ink/45">{project.name}</p></div>
      </div>
      <div className="min-w-0"><p className="truncate text-sm font-medium text-ink/75">{summary}</p><p className="mt-1 text-xs text-ink/38">{isComplete ? "Saved for reference" : `${missing} item${missing === 1 ? "" : "s"} missing`}</p></div>
      <p className="text-sm text-ink/55">{formatDate(project.dueDate)}</p>
      <div><div className="flex items-center justify-between text-xs"><span className="font-semibold text-ink/65">{progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]"><span className={`block h-full rounded-full ${isComplete ? "bg-teal" : "bg-ink/70"}`} style={{ width: `${progress}%` }} /></div></div>
      <span className="hidden h-8 w-8 items-center justify-center rounded-full border border-line text-ink/40 transition group-hover:border-ink/30 group-hover:bg-ink group-hover:text-white lg:inline-flex"><ArrowRight size={15} /></span>
    </Link>
  );
}

function waitingSummary(projectId: string, state: ProjectPacketState) {
  const items = state.checklistItems.filter((item) => item.projectId === projectId).sort((a, b) => a.sortOrder - b.sortOrder);
  const submitted = items.find((item) => item.status === "submitted");
  const changes = items.find((item) => item.status === "changes_requested");
  const missing = items.filter((item) => item.required && ["requested", "changes_requested"].includes(item.status));
  if (submitted) return `Review ${submitted.title}`;
  if (changes) return `Waiting on revised ${changes.title}`;
  if (missing.length) return `Waiting on ${formatItemList(missing)}`;
  return "Ready for a final check";
}

function formatItemList(items: ChecklistItem[]) {
  const names = items.slice(0, 2).map((item) => item.title.toLowerCase());
  return items.length > 2 ? `${names.join(", ")} + ${items.length - 2}` : names.join(" and ");
}
