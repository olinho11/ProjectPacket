"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, CircleSlash2, Clock3, FileUp, Link2, LockKeyhole, Send } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui";
import { hasValidHex, invalidHexTokens, isColorItem, parseColorSwatches } from "@/src/colors";
import {
  allowedUploadSummary,
  CREATIVE_ASSET_CONFIRMATION,
  FILE_ACCEPT_ATTRIBUTE,
  SENSITIVE_UPLOAD_WARNING,
  validateCreativeAssetFile
} from "@/src/file-safety";
import {
  CLIENT_COMMENT_MAX_LENGTH,
  LINK_VALUE_MAX_LENGTH,
  TEXT_ANSWER_MAX_LENGTH,
  validateSubmissionLengths
} from "@/src/submission-limits";
import { formatDate, projectProgress, useProjectPacket } from "@/src/store";
import { ChecklistItem, Project, Submission, User } from "@/src/types";

interface ClientDraft {
  textValue: string;
  linkValue: string;
  clientComment: string;
  approvedValue: boolean;
  fileName: string;
  fileDataUrl: string;
}

interface PacketPayload {
  project: Project;
  user: User | null;
  items: ChecklistItem[];
  submissions: Submission[];
}

export default function ClientPortalPage({ params }: { params: { token: string } }) {
  const {
    state,
    getProjectByToken,
    getProjectItems,
    getProjectProgress,
    getItemSubmission,
    submitItemByToken
  } = useProjectPacket();
  const localProject = getProjectByToken(params.token);
  const [packet, setPacket] = useState<PacketPayload | null>(null);
  const [isLoadingPacket, setIsLoadingPacket] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ClientDraft>>({});
  const [savedItem, setSavedItem] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [hasAcceptedCreativeOnly, setHasAcceptedCreativeOnly] = useState(false);
  const project = packet?.project ?? localProject;

  const loadPacket = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoadingPacket(true);
    }
    setLoadError("");

    try {
      const response = await fetch(`/api/public/packet/${params.token}`, { cache: "no-store" });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Could not load this packet.");
      }

      const body = (await response.json()) as PacketPayload;
      setPacket(body);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Could not load this packet.");
    } finally {
      if (!silent) {
        setIsLoadingPacket(false);
      }
    }
  }, [params.token]);

  useEffect(() => {
    void loadPacket();

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void loadPacket(true);
      }
    };
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadPacket]);

  useEffect(() => {
    const accepted = window.localStorage.getItem(confirmationStorageKey(params.token)) === "true";
    setHasAcceptedCreativeOnly(accepted);
  }, [params.token]);

  if (isLoadingPacket && !project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper p-4">
        <Card className="w-full max-w-lg p-6 text-center">
          <h1 className="text-2xl font-semibold">Loading packet...</h1>
          <p className="mt-2 text-sm leading-6 text-ink/60">Checking this upload link.</p>
        </Card>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper p-4">
        <Card className="w-full max-w-lg p-6 text-center">
          <LockKeyhole className="mx-auto text-teal" size={30} aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-semibold">Upload link not found</h1>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            {loadError || "Ask your freelancer to send a fresh ProjectPacket link."}
          </p>
        </Card>
      </main>
    );
  }

  const user = packet?.user ?? state.users.find((candidate) => candidate.id === project.userId);
  const items = packet?.items ?? getProjectItems(project.id);
  const progress = packet ? projectProgress(project.id, items) : getProjectProgress(project.id);
  const findSubmission = (itemId: string) =>
    packet
      ? packet.submissions
          .filter((submission) => submission.checklistItemId === itemId)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
      : getItemSubmission(itemId);

  function updateDraft(itemId: string, input: Partial<ClientDraft>) {
    setItemErrors((previous) => ({ ...previous, [itemId]: "" }));
    setDrafts((previous) => ({
      ...previous,
      [itemId]: { ...(previous[itemId] ?? blankDraft()), ...input }
    }));
  }

  function updateCreativeOnlyConfirmation(accepted: boolean) {
    setHasAcceptedCreativeOnly(accepted);
    window.localStorage.setItem(confirmationStorageKey(params.token), String(accepted));
  }

  async function handleFile(item: ChecklistItem, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validation = validateCreativeAssetFile({
      fileName: file.name,
      size: file.size,
      contentType: file.type
    });

    if (!validation.valid) {
      setItemErrors((previous) => ({ ...previous, [item.id]: validation.error }));
      event.target.value = "";
      return;
    }

    const fileDataUrl = await readFileAsDataUrl(file);
    updateDraft(item.id, { fileName: file.name, fileDataUrl });
  }

  async function handleSubmit(item: ChecklistItem, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = drafts[item.id] ?? blankDraft();
    const colorField = item.type === "text" && isColorItem(item.title, item.description);
    const invalidColors = colorField ? invalidHexTokens(draft.textValue) : [];

    if (item.status === "approved" || item.status === "waived") {
      setItemErrors((previous) => ({
        ...previous,
        [item.id]: item.status === "approved"
          ? "This item is already approved. Ask your freelancer before sending a replacement."
          : "Your freelancer marked this item as no longer needed."
      }));
      return;
    }

    if (!hasAcceptedCreativeOnly) {
      setItemErrors((previous) => ({
        ...previous,
        [item.id]: "Confirm this packet is for creative project assets before saving."
      }));
      return;
    }

    if (invalidColors.length) {
      setItemErrors((previous) => ({
        ...previous,
        [item.id]: `Check this color value: ${invalidColors.join(", ")}`
      }));
      return;
    }

    if (colorField && !hasValidHex(draft.textValue)) {
      setItemErrors((previous) => ({
        ...previous,
        [item.id]: "Add at least one hex color, like #214D3F."
      }));
      return;
    }

    if (item.type === "approval" && !draft.approvedValue) {
      setItemErrors((previous) => ({
        ...previous,
        [item.id]: "Check the approval box before saving this item."
      }));
      return;
    }

    const lengthError = validateSubmissionLengths({
      textValue: item.type === "text" ? draft.textValue : undefined,
      linkValue: item.type === "link" ? draft.linkValue : undefined,
      clientComment: draft.clientComment
    });

    if (lengthError) {
      setItemErrors((previous) => ({ ...previous, [item.id]: lengthError }));
      return;
    }

    const payload = {
      fileName: item.type === "file" ? draft.fileName : undefined,
      fileDataUrl: item.type === "file" ? draft.fileDataUrl : undefined,
      textValue: item.type === "text" ? draft.textValue : undefined,
      linkValue: item.type === "link" ? draft.linkValue : undefined,
      approvedValue: item.type === "approval" ? draft.approvedValue : undefined,
      clientComment: draft.clientComment,
      acceptedCreativeAssetOnly: hasAcceptedCreativeOnly
    };

    try {
      if (packet) {
        const response = await fetch(`/api/public/packet/${params.token}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.id, ...payload })
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "Could not save this item.");
        }

        const body = (await response.json()) as { submission: Submission };
        setPacket((previous) =>
          previous
            ? {
                ...previous,
                items: previous.items.map((candidate) =>
                  candidate.id === item.id
                    ? { ...candidate, status: "submitted", changeRequestNote: "" }
                    : candidate
                ),
                submissions: [
                  body.submission,
                  ...previous.submissions.filter((submission) => submission.checklistItemId !== item.id)
                ]
              }
            : previous
        );
      } else {
          await submitItemByToken(params.token, item.id, payload);
      }

      setSavedItem(item.id);
      await loadPacket(true);
    } catch (caught) {
      setItemErrors((previous) => ({
        ...previous,
        [item.id]: caught instanceof Error ? caught.message : "Could not save this item."
      }));
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-xs font-bold text-white">
              PP
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user?.businessName ?? "Your freelancer"}</span>
              <span className="block text-xs text-ink/50">Client asset request</span>
            </span>
          </div>
          <Link className="text-sm font-semibold text-ink/60 hover:text-ink" href="/">
            ProjectPacket
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Card className="overflow-hidden">
          <div className="grid gap-5 border-b border-line p-5 sm:p-6 lg:grid-cols-[1fr_240px] lg:items-center">
            <div>
              <p className="text-sm font-medium text-ink/50">For {project.clientName}</p>
              <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{project.name}</h1>
              <p className="mt-2 text-sm text-ink/60">Due {formatDate(project.dueDate)}. Submit each requested item below.</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink/60">Progress</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
          <div className="bg-[#fbfaf7] px-5 py-3 text-sm text-ink/60 sm:px-6">
            Use this page to send the requested files, notes, links, and approvals.
          </div>
        </Card>

        <Card className="mt-5 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-sm font-semibold">Creative assets only</p>
              <p className="mt-1 text-sm leading-6 text-ink/60">{SENSITIVE_UPLOAD_WARNING}</p>
            </div>
            <label className="flex items-start gap-3 rounded-md border border-line bg-[#fbfaf7] p-3 text-sm font-semibold">
              <input
                className="mt-1"
                type="checkbox"
                checked={hasAcceptedCreativeOnly}
                onChange={(event) => updateCreativeOnlyConfirmation(event.target.checked)}
              />
              {CREATIVE_ASSET_CONFIRMATION}
            </label>
          </div>
        </Card>

        <div className="mt-5 grid gap-4">
          {items.map((item) => {
            const submission = findSubmission(item.id);
            const draft = drafts[item.id] ?? blankDraft();
            const colorField = item.type === "text" && isColorItem(item.title, item.description);
            const previewColors = colorField ? parseColorSwatches(draft.textValue || submission?.textValue) : [];
            const error = itemErrors[item.id];
            const isLockedByReview = item.status === "approved" || item.status === "waived";

            return (
              <Card key={item.id} className="p-5">
                <form onSubmit={(event) => handleSubmit(item, event)} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{item.title}</h2>
                      <StatusBadge status={item.status} />
                      {!item.required ? <span className="text-xs font-semibold text-ink/40">Optional</span> : null}
                    </div>
                    {item.description ? <p className="mt-2 text-sm leading-6 text-ink/60">{item.description}</p> : null}
                    <ClientReviewNotice item={item} hasSubmission={Boolean(submission)} />
                    {item.changeRequestNote ? (
                      <p className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                        {item.changeRequestNote}
                      </p>
                    ) : null}
                    {submission ? (
                      <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ink/60">
                        <CheckCircle2 size={15} className="text-ink/40" aria-hidden="true" />
                        Last submission saved
                      </p>
                    ) : null}
                    {previewColors.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {previewColors.map((color) => (
                          <span key={`${item.id}-${color.label}-${color.value}`} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-2">
                            <span className="h-4 w-4 rounded-sm border border-black/10" style={{ backgroundColor: color.value }} />
                            <span className="text-xs font-semibold text-ink/70">{color.label}</span>
                            <span className="font-mono text-xs text-ink/50">{color.value}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {savedItem === item.id ? (
                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 size={16} aria-hidden="true" />
                        Saved.
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 rounded-md border border-line bg-[#fbfaf7] p-4">
                    {item.type === "file" ? (
                      <label className="focus-ring flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal">
                        <FileUp size={16} aria-hidden="true" />
                        {draft.fileName || "Choose file"}
                        <input
                          className="sr-only"
                          type="file"
                          accept={FILE_ACCEPT_ATTRIBUTE}
                          onChange={(event) => void handleFile(item, event)}
                          disabled={isLockedByReview}
                          required={!submission && !draft.fileName}
                        />
                      </label>
                    ) : null}
                    {item.type === "text" ? (
                      <Field label={colorField ? "Brand colors" : "Your answer"} hint={colorField ? "Use labels and hex values, like Primary #214D3F, Cream #F6EFE2." : undefined}>
                        <textarea
                          className={textareaClass}
                          maxLength={TEXT_ANSWER_MAX_LENGTH}
                          value={draft.textValue}
                          onChange={(event) => updateDraft(item.id, { textValue: event.target.value })}
                          disabled={isLockedByReview}
                          required
                        />
                        <CharacterCounter value={draft.textValue.length} max={TEXT_ANSWER_MAX_LENGTH} />
                      </Field>
                    ) : null}
                    {error ? <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">{error}</p> : null}
                    {item.type === "link" ? (
                      <Field label="Link">
                        <div className="relative">
                          <Link2 className="pointer-events-none absolute left-3 top-3 text-ink/40" size={16} aria-hidden="true" />
                          <input
                            className={`${inputClass} w-full pl-9`}
                            maxLength={LINK_VALUE_MAX_LENGTH}
                            type="url"
                            value={draft.linkValue}
                            onChange={(event) => updateDraft(item.id, { linkValue: event.target.value })}
                            placeholder="https://example.com"
                            disabled={isLockedByReview}
                            required
                          />
                        </div>
                        <CharacterCounter value={draft.linkValue.length} max={LINK_VALUE_MAX_LENGTH} />
                      </Field>
                    ) : null}
                    {item.type === "approval" ? (
                      <label className="flex items-start gap-3 rounded-md border border-line bg-white p-3 text-sm font-semibold">
                        <input type="checkbox" checked={draft.approvedValue} onChange={(event) => updateDraft(item.id, { approvedValue: event.target.checked })} disabled={isLockedByReview} required />
                        I approve this item.
                      </label>
                    ) : null}
                    <Field label="Comment">
                      <textarea
                        className={textareaClass}
                        maxLength={CLIENT_COMMENT_MAX_LENGTH}
                        value={draft.clientComment}
                        onChange={(event) => updateDraft(item.id, { clientComment: event.target.value })}
                        placeholder="Optional note"
                        disabled={isLockedByReview}
                      />
                      <CharacterCounter value={draft.clientComment.length} max={CLIENT_COMMENT_MAX_LENGTH} />
                    </Field>
                    <p className="text-xs leading-5 text-ink/50">
                      {item.type === "file"
                        ? `Allowed files: ${allowedUploadSummary()}.`
                        : "You can save each item as soon as it is ready."}
                    </p>
                    <Button type="submit" disabled={!hasAcceptedCreativeOnly || isLockedByReview}>
                      <Send size={16} aria-hidden="true" />
                      {isLockedByReview ? "No action needed" : "Save item"}
                    </Button>
                  </div>
                </form>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ClientReviewNotice({ item, hasSubmission }: { item: ChecklistItem; hasSubmission: boolean }) {
  const notice = clientNoticeForItem(item, hasSubmission);

  return (
    <div className={`mt-3 rounded-md border px-3 py-2 text-sm leading-6 ${notice.className}`}>
      <div className="flex items-start gap-2">
        <notice.Icon className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
        <div>
          <p className="font-semibold">{notice.title}</p>
          <p className="text-current/80">{notice.message}</p>
        </div>
      </div>
    </div>
  );
}

function clientNoticeForItem(item: ChecklistItem, hasSubmission: boolean) {
  if (item.status === "approved") {
    return {
      Icon: CheckCircle2,
      title: "Approved",
      message: "Your freelancer approved this item. No more action is needed here.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800"
    };
  }

  if (item.status === "changes_requested") {
    return {
      Icon: AlertCircle,
      title: "Changes requested",
      message: item.changeRequestNote || "Your freelancer asked for an updated version. Make the change and save this item again.",
      className: "border-orange-200 bg-orange-50 text-orange-800"
    };
  }

  if (item.status === "waived") {
    return {
      Icon: CircleSlash2,
      title: "No longer needed",
      message: "Your freelancer waived this item. You do not need to upload or approve anything here.",
      className: "border-line bg-[#fbfaf7] text-ink/65"
    };
  }

  if (item.status === "submitted" || hasSubmission) {
    return {
      Icon: Clock3,
      title: "Sent for review",
      message: "Your latest submission is saved. Your freelancer can approve it or ask for changes.",
      className: "border-blue-200 bg-blue-50 text-blue-800"
    };
  }

  return {
    Icon: AlertCircle,
    title: "Still needed",
    message: "This item is still open. If you already sent something before, your freelancer may need a fresh version.",
    className: "border-line bg-[#fbfaf7] text-ink/65"
  };
}

function CharacterCounter({ value, max }: { value: number; max: number }) {
  const isNearLimit = value > max * 0.85;

  return (
    <span className={`text-right text-xs ${isNearLimit ? "text-orange-700" : "text-ink/45"}`}>
      {value}/{max}
    </span>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function blankDraft(): ClientDraft {
  return {
    textValue: "",
    linkValue: "",
    clientComment: "",
    approvedValue: false,
    fileName: "",
    fileDataUrl: ""
  };
}

function confirmationStorageKey(token: string) {
  return `projectpacket_creative_asset_confirmation_${token}`;
}
