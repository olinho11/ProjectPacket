"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CopyPlus, Plus, Save, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, EmptyState, Field, inputClass, PageHeader, selectClass, textareaClass } from "@/components/ui";
import { getCustomTemplateLimit, TEMPLATE_LIMIT_MESSAGE } from "@/src/plans";
import { ChecklistItemType, Template } from "@/src/types";
import { useProjectPacket } from "@/src/store";

interface DraftTemplateItem {
  title: string;
  description: string;
  type: ChecklistItemType;
  required: boolean;
}

export default function TemplatesPage() {
  const { state, currentUser, addTemplate, updateTemplate, deleteTemplate } = useProjectPacket();
  const templates = state.templates.filter((template) => template.userId === currentUser?.id);
  const subscription = state.subscriptions.find((candidate) => candidate.userId === currentUser?.id);
  const customTemplateLimit = getCustomTemplateLimit(subscription?.plan);
  const customTemplateCount = templates.filter((template) => isCustomTemplate(template.id)).length;
  const isAtTemplateLimit = customTemplateLimit !== null && customTemplateCount >= customTemplateLimit;
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? templates[0],
    [templates, selectedId]
  );
  const [draft, setDraft] = useState(() => toDraft(selectedTemplate));
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    if (!templates.length || selectedTemplate) {
      return;
    }

    setSelectedId(templates[0].id);
    setDraft(toDraft(templates[0]));
  }, [selectedTemplate, templates]);

  function chooseTemplate(template: Template) {
    setSelectedId(template.id);
    setDraft(toDraft(template));
    setNotice("");
  }

  function newTemplate() {
    if (isAtTemplateLimit) {
      setNotice(TEMPLATE_LIMIT_MESSAGE);
      return;
    }

    setSelectedId("");
    setDraft({
      name: "New template",
      description: "A reusable checklist for client assets.",
      items: [{ title: "New asset", description: "", type: "file", required: true }]
    });
    setNotice("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    if ((!selectedId || !isCustomTemplate(selectedId)) && isAtTemplateLimit) {
      setNotice(TEMPLATE_LIMIT_MESSAGE);
      return;
    }

    setIsSaving(true);

    try {
      if (selectedId) {
        const template = await updateTemplate(selectedId, draft);
        setSelectedId(template.id);
        setNotice("Template updated.");
        return;
      }

      const template = await addTemplate(draft);
      setSelectedId(template.id);
      setNotice("Template created.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not save template.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeSelectedTemplate() {
    if (!selectedId) {
      return;
    }

    setNotice("");
    setIsSaving(true);

    try {
      await deleteTemplate(selectedId);
      setIsDeleteOpen(false);
      newTemplate();
      setNotice("Template deleted.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not delete template.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Templates"
        title="Reusable asset checklists"
        description="Start projects faster with checklist templates for common creative work."
        action={
          <Button onClick={newTemplate} disabled={isAtTemplateLimit}>
            <Plus size={16} aria-hidden="true" />
            New template
          </Button>
        }
      />
      <div className="grid min-w-0 gap-5 p-4 sm:p-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-h-0 overflow-hidden self-start xl:max-h-full">
          <div className="border-b border-line p-5">
            <p className="text-sm font-medium text-ink/50">Library</p>
            <h2 className="mt-2 text-lg font-semibold">Templates</h2>
            <p className="mt-2 text-xs leading-5 text-ink/50">
              Custom templates: {customTemplateCount}{customTemplateLimit === null ? "" : `/${customTemplateLimit}`}. Starter and above get unlimited templates.
            </p>
          </div>
          <div className="max-h-[360px] divide-y divide-line overflow-y-auto xl:max-h-[calc(100vh-250px)]">
            {templates.length ? (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => chooseTemplate(template)}
                  className={`w-full px-5 py-4 text-left transition hover:bg-paper ${
                    selectedId === template.id ? "border-l-2 border-teal bg-[#f7f8f5] pl-[18px]" : "bg-white"
                  }`}
                >
                  <p className="font-semibold">{template.name}</p>
                  <p className="mt-1 text-sm text-ink/60">{template.items.length} items</p>
                </button>
              ))
            ) : (
              <div className="p-5">
                <EmptyState title="No templates" description="Create a checklist you can reuse for future projects." />
              </div>
            )}
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <form onSubmit={handleSave} className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto]">
            <div className="border-b border-line p-5 pb-4">
              <p className="text-sm font-medium text-ink/50">Editor</p>
              <h2 className="mt-2 text-lg font-semibold">Checklist template</h2>
            </div>
            <div className="grid gap-4 border-b border-line p-5">
              <Field label="Template name">
                <input className={inputClass} value={draft.name} onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))} required />
              </Field>
              <Field label="Description">
                <textarea className={`${textareaClass} min-h-20`} value={draft.description} onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))} required />
              </Field>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Items</h2>
                  <p className="mt-1 text-sm text-ink/60">These become editable project checklist rows.</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setDraft((previous) => ({
                      ...previous,
                      items: [...previous.items, { title: "New asset", description: "", type: "file", required: true }]
                    }))
                  }
                >
                  <CopyPlus size={16} aria-hidden="true" />
                  Add item
                </Button>
              </div>
            </div>
            <div className="min-h-[320px] divide-y divide-line overflow-y-auto xl:min-h-0">
              {draft.items.map((item, index) => (
                <div key={`${item.title}-${index}`} className="grid min-w-0 gap-3 p-5 transition hover:bg-[#fafbf8]">
                  <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_150px_auto]">
                    <input
                      className={inputClass}
                      value={item.title}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          items: previous.items.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, title: event.target.value } : candidate)
                        }))
                      }
                    />
                    <select
                      className={selectClass}
                      value={item.type}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          items: previous.items.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, type: event.target.value as ChecklistItemType } : candidate)
                        }))
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
                      onClick={() =>
                        setDraft((previous) => ({
                          ...previous,
                          items: previous.items.filter((_, itemIndex) => itemIndex !== index)
                        }))
                      }
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </div>
                  <textarea
                    className={textareaClass}
                    value={item.description}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        items: previous.items.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, description: event.target.value } : candidate)
                      }))
                    }
                  />
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink/70">
                    <input
                      type="checkbox"
                      checked={item.required}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          items: previous.items.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, required: event.target.checked } : candidate)
                        }))
                      }
                    />
                    Required
                  </label>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving}>
                  <Save size={16} aria-hidden="true" />
                  {isSaving ? "Saving..." : "Save template"}
                </Button>
                {selectedId ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={isSaving}
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </Button>
                ) : null}
              </div>
              {notice ? <p className="text-sm font-medium text-ink/60">{notice}</p> : null}
              {notice === TEMPLATE_LIMIT_MESSAGE ? (
                <a className="text-sm font-semibold text-teal hover:underline" href="/upgrade">
                  Compare plans
                </a>
              ) : null}
            </div>
          </form>
        </Card>
      </div>
      {isDeleteOpen ? (
        <DeleteTemplateDialog
          templateName={selectedTemplate?.name ?? "this template"}
          isDeleting={isSaving}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={() => void removeSelectedTemplate()}
        />
      ) : null}
    </AppShell>
  );
}

function DeleteTemplateDialog({
  templateName,
  isDeleting,
  onClose,
  onConfirm
}: {
  templateName: string;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 py-6 backdrop-blur-[2px]">
      <section className="w-full max-w-md overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_70px_rgba(31,36,33,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-medium text-ink/50">Delete template</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">Delete {templateName}?</h2>
          </div>
          <button
            type="button"
            aria-label="Close delete dialog"
            className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink/50 hover:bg-black/[0.045] hover:text-ink"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm leading-6 text-ink/65">
            This removes the reusable checklist. Existing packets will not be deleted.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={onConfirm} disabled={isDeleting}>
              <Trash2 size={16} aria-hidden="true" />
              {isDeleting ? "Deleting..." : "Delete template"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function toDraft(template?: Template): {
  name: string;
  description: string;
  items: DraftTemplateItem[];
} {
  return {
    name: template?.name ?? "New template",
    description: template?.description ?? "A reusable checklist for client assets.",
    items:
      template?.items.map(({ title, description, type, required }) => ({
        title,
        description,
        type,
        required
      })) ?? [{ title: "New asset", description: "", type: "file", required: true }]
  };
}

function isCustomTemplate(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
