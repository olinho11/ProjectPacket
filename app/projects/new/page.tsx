"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, ButtonLink, Card, Field, buttonClass, inputClass, PageHeader, selectClass, textareaClass } from "@/components/ui";
import { SENSITIVE_UPLOAD_WARNING } from "@/src/file-safety";
import { getPlanLimit, isActiveProjectStatus, PLAN_LIMIT_MESSAGE } from "@/src/plans";
import { SUPPORT_EMAIL } from "@/src/legal";
import { ChecklistItemType } from "@/src/types";
import { useProjectPacket } from "@/src/store";

interface DraftItem {
  title: string;
  description: string;
  type: ChecklistItemType;
  required: boolean;
}

const upgradeTiers = [
  { name: "Free", price: "$0", detail: "1 active packet" },
  { name: "Starter", price: "$9/mo", detail: "5 active packets", highlighted: true },
  { name: "Pro", price: "$19/mo", detail: "25 active packets" },
  { name: "Studio", price: "$39/mo", detail: "Unlimited packets + branding" }
];

export default function NewProjectPage() {
  const router = useRouter();
  const { state, currentUser, createProject, getUserProjects } = useProjectPacket();
  const templates = state.templates.filter((template) => template.userId === currentUser?.id);
  const subscription = state.subscriptions.find((candidate) => candidate.userId === currentUser?.id);
  const activeProjectCount = getUserProjects().filter((project) => isActiveProjectStatus(project.status)).length;
  const planLimit = getPlanLimit(subscription?.plan);
  const isAtProjectLimit = planLimit !== null && activeProjectCount >= planLimit;
  const firstTemplate = templates[0];
  const [templateId, setTemplateId] = useState(firstTemplate?.id ?? "");
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) ?? firstTemplate,
    [templates, templateId, firstTemplate]
  );
  const [name, setName] = useState("New website launch");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [dueDate, setDueDate] = useState(nextWeekDate());
  const [items, setItems] = useState<DraftItem[]>(
    selectedTemplate?.items.map(({ title, description, type, required }) => ({
      title,
      description,
      type,
      required
    })) ?? []
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (isAtProjectLimit) {
      setShowUpgradeModal(true);
    }
  }, [isAtProjectLimit]);

  useEffect(() => {
    if (!templates.length || items.length) {
      return;
    }

    const template = selectedTemplate ?? templates[0];
    setTemplateId(template.id);
    setItems(template.items.map(({ title, description, type, required }) => ({ title, description, type, required })));
  }, [templates, selectedTemplate, items.length]);

  function applyTemplate(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const template = templates.find((candidate) => candidate.id === nextTemplateId);

    if (template) {
      setItems(template.items.map(({ title, description, type, required }) => ({ title, description, type, required })));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!items.length) {
      setError("Add at least one checklist item before creating the project.");
      return;
    }

    if (isAtProjectLimit) {
      setShowUpgradeModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const project = await createProject({ name, clientName, clientEmail, dueDate, items });
      router.push(`/projects/${project.id}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not save this project.";

      if (message === PLAN_LIMIT_MESSAGE) {
        setShowUpgradeModal(true);
        return;
      }

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="New project"
        title="Create a client packet"
        description="Pick a template, adjust the checklist, then send one upload link."
      />
      <form onSubmit={handleSubmit} className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="grid gap-4 p-5 self-start">
          <div className="border-b border-line pb-4">
            <p className="text-sm font-medium text-ink/50">Packet details</p>
            <h2 className="mt-2 text-lg font-semibold">Client and deadline</h2>
          </div>
          <Field label="Project name">
            <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Client name">
            <input className={inputClass} value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Greenline Coffee" required />
          </Field>
          <Field label="Client email">
            <input className={inputClass} type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="client@example.com" required />
          </Field>
          <Field label="Due date">
            <input className={inputClass} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
          </Field>
          <Field label="Template">
            <select className={selectClass} value={templateId} onChange={(event) => applyTemplate(event.target.value)}>
              {!templates.length ? <option value="">No templates yet</option> : null}
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </Field>
          <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-800">
            {SENSITIVE_UPLOAD_WARNING}
          </p>
          <p className="text-xs leading-5 text-ink/50">
            Plan usage: {activeProjectCount}{planLimit === null ? "" : `/${planLimit}`} active packet{activeProjectCount === 1 ? "" : "s"}.
          </p>
          {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create packet"}
          </Button>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-ink/50">Client checklist</p>
              <h2 className="mt-2 text-lg font-semibold">Requested items</h2>
              <p className="mt-1 text-sm text-ink/60">Clients will see these items on their upload page.</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setItems((previous) => [...previous, { title: "New item", description: "", type: "file", required: true }])}
            >
              <Plus size={16} aria-hidden="true" />
              Add item
            </Button>
          </div>
          <div className="mt-5 grid gap-4">
            {items.map((item, index) => (
              <div key={`${item.title}-${index}`} className="grid gap-3 rounded-md border border-line bg-[#fbfaf7] p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_150px_auto]">
                  <input
                    className={inputClass}
                    value={item.title}
                    onChange={(event) =>
                      setItems((previous) => previous.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, title: event.target.value } : candidate))
                    }
                  />
                  <select
                    className={selectClass}
                    value={item.type}
                    onChange={(event) =>
                      setItems((previous) => previous.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, type: event.target.value as ChecklistItemType } : candidate))
                    }
                  >
                    <option value="file">File</option>
                    <option value="text">Text</option>
                    <option value="link">Link</option>
                    <option value="approval">Approval</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3"
                    onClick={() => setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </div>
                <textarea
                  className={textareaClass}
                  value={item.description}
                  onChange={(event) =>
                    setItems((previous) => previous.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, description: event.target.value } : candidate))
                  }
                />
                <label className="flex items-center gap-2 text-sm font-semibold text-ink/70">
                  <input
                    type="checkbox"
                    checked={item.required}
                    onChange={(event) =>
                      setItems((previous) => previous.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, required: event.target.checked } : candidate))
                    }
                  />
                  Required
                </label>
              </div>
            ))}
          </div>
        </Card>
      </form>
      {showUpgradeModal ? (
        <UpgradeLimitModal onClose={() => setShowUpgradeModal(false)} />
      ) : null}
    </AppShell>
  );
}

function UpgradeLimitModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6 backdrop-blur-[2px]">
      <section
        aria-labelledby="upgrade-limit-title"
        aria-modal="true"
        role="dialog"
        className="w-full max-w-[460px] overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_70px_rgba(31,36,33,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-medium text-ink/50">Plan limit</p>
            <h2 id="upgrade-limit-title" className="mt-2 text-xl font-semibold tracking-[-0.01em] text-ink">
              You&apos;ve reached the Free plan limit
            </h2>
          </div>
          <button
            aria-label="Close upgrade modal"
            className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink/50 hover:bg-black/[0.045] hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-6 text-ink/65">
            Free includes 1 active packet. Upgrade to Starter to manage up to 5 active packets.
          </p>

          <div className="mt-4 overflow-hidden rounded-md border border-line text-sm">
            {upgradeTiers.map((tier, index) => (
              <div
                key={tier.name}
                className={`grid gap-1 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3 ${
                  index > 0 ? "border-t border-line" : ""
                } ${tier.highlighted ? "bg-teal/[0.06]" : index === 0 ? "bg-[#fbfaf7]" : "bg-white"}`}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-ink">{tier.name}</span>
                  <span className="text-xs font-medium text-ink/45">{tier.price}</span>
                  {tier.highlighted ? (
                    <span className="rounded-sm border border-teal/15 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-teal">
                      Best next step
                    </span>
                  ) : null}
                </div>
                <span className="text-ink/60 sm:text-right">{tier.detail}</span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs leading-5 text-ink/50">
            Completed packets do not count toward your active packet limit.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
            <a className={buttonClass("primary")} href={`mailto:${SUPPORT_EMAIL}?subject=Upgrade ProjectPacket`}>
              Contact support to upgrade
            </a>
            <ButtonLink href="/projects" variant="secondary">
              Back to packets
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function nextWeekDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}
