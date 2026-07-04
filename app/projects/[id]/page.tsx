"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardCopy, Download, ExternalLink, KeyRound, MailPlus, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatActivityTime } from "@/src/activity";
import { invalidHexTokens, isColorItem, parseColorSwatches } from "@/src/colors";
import { SENSITIVE_UPLOAD_WARNING } from "@/src/file-safety";
import { formatDate, useProjectPacket } from "@/src/store";
import { getBearerAuthHeaders } from "@/src/supabase/browser-auth";

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const {
    getProject,
    getProjectItems,
    getProjectSubmissions,
    getItemSubmission,
    getProjectLogs,
    getProjectProgress,
    getMissingCount,
    updateItemStatus,
    deleteSubmission,
    deleteProject,
    sendReminder,
    refreshWorkspace
  } = useProjectPacket();
  const [notice, setNotice] = useState("");
  const project = getProject(params.id);
  const projectId = project?.id ?? params.id;
  const isProjectLoaded = Boolean(project);

  useEffect(() => {
    if (!isProjectLoaded) {
      return;
    }

    let cancelled = false;
    const refresh = () => {
      if (!cancelled && document.visibilityState === "visible") {
        void refreshWorkspace();
      }
    };

    refresh();
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [isProjectLoaded, projectId, refreshWorkspace]);

  if (!project) {
    return (
      <AppShell>
        <PageHeader title="Packet not found" description="That client packet does not exist." />
        <div className="p-6">
          <ButtonLink href="/projects">Back to packets</ButtonLink>
        </div>
      </AppShell>
    );
  }

  const items = getProjectItems(project.id);
  const submissions = getProjectSubmissions(project.id);
  const logs = getProjectLogs(project.id);
  const progress = getProjectProgress(project.id);
  // Client portals use an unguessable share token, not the project id.
  // Anyone with the link can submit for now; later versions can add optional expiry/passcode controls.
  const uploadPath = `/p/${project.token}`;
  function copyLink() {
    const fullUrl = typeof window === "undefined" ? uploadPath : `${window.location.origin}${uploadPath}`;
    navigator.clipboard?.writeText(fullUrl);
    setNotice("Client link copied.");
  }

  async function saveStatus(itemId: string, status: Parameters<typeof updateItemStatus>[2], note = "") {
    try {
      await updateItemStatus(projectId, itemId, status, note);
      await refreshWorkspace();
      setNotice("Saved.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not save that change.");
    }
  }

  async function draftReminder() {
    try {
      setNotice(await sendReminder(projectId));
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not save reminder.");
    }
  }

  async function removeSubmission(submissionId: string) {
    if (!window.confirm("Delete this submission and any uploaded file?")) {
      return;
    }

    try {
      await deleteSubmission(submissionId);
      await refreshWorkspace();
      setNotice("Submission deleted.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not delete submission.");
    }
  }

  async function removeProject() {
    if (!window.confirm("Delete this project, all submissions, and uploaded files?")) {
      return;
    }

    try {
      await deleteProject(projectId);
      router.push("/projects");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not delete project.");
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Client packet"
        title={project.name}
        description={`${project.clientName} · due ${formatDate(project.dueDate)} · ${getMissingCount(project.id)} items missing`}
        action={
          <>
            <Button variant="secondary" onClick={copyLink}>
              <ClipboardCopy size={16} aria-hidden="true" />
              Copy link
            </Button>
            <Button onClick={() => void draftReminder()}>
              <MailPlus size={16} aria-hidden="true" />
              Reminder
            </Button>
          </>
        }
      />

      <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-5">
          <Card className="overflow-hidden">
            <div className="grid gap-5 border-b border-line p-5 lg:grid-cols-[1fr_240px] lg:items-center">
              <div>
                <p className="text-sm text-ink/50">{submissions.length} submissions received</p>
                <h2 className="mt-3 text-xl font-semibold">Review checklist</h2>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  Approve what is ready, request cleaner resubmits, or waive items you no longer need.
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink/60">Packet progress</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <div className="divide-y divide-line">
              {items.map((item) => {
                const submission = getItemSubmission(item.id);

                return (
                  <article key={item.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{item.title}</h3>
                        <StatusBadge status={item.status} />
                        <span className="text-xs text-ink/40">{item.type}</span>
                        {!item.required ? <span className="text-xs text-ink/40">Optional</span> : null}
                      </div>
                      {item.description ? <p className="mt-2 text-sm leading-6 text-ink/60">{item.description}</p> : null}
                      {item.changeRequestNote ? (
                        <p className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
                          {item.changeRequestNote}
                        </p>
                      ) : null}
                      <div className="mt-3">
                        {submission ? (
                          <SubmissionView submissionId={submission.id} onDelete={removeSubmission} />
                        ) : (
                          <p className="rounded-md border border-dashed border-line bg-[#fbfaf7] px-3 py-2 text-sm text-ink/50">
                            Waiting on client.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-3"
                        disabled={!["submitted", "changes_requested"].includes(item.status)}
                        onClick={() => void saveStatus(item.id, "approved")}
                      >
                        <CheckCircle2 size={15} aria-hidden="true" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-3"
                        disabled={!["submitted", "approved"].includes(item.status)}
                        onClick={() => void saveStatus(item.id, "changes_requested", "Please update this asset and resubmit it.")}
                      >
                        <XCircle size={15} aria-hidden="true" />
                        Changes
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-9 px-3"
                        onClick={() => void saveStatus(item.id, "waived")}
                      >
                        <ShieldCheck size={15} aria-hidden="true" />
                        Waive
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </Card>
        </div>

        <aside className="grid gap-5 self-start">
          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Client link</p>
            <h2 className="mt-2 text-lg font-semibold">Send this once</h2>
            <p className="mt-3 break-all rounded-md border border-line bg-[#fbfaf7] p-3 text-sm leading-6 text-ink/60">
              {uploadPath}
            </p>
            <div className="mt-4 grid gap-2">
              <Button onClick={copyLink}>
                <ClipboardCopy size={16} aria-hidden="true" />
                Copy link
              </Button>
              <ButtonLink href={uploadPath} variant="secondary">
                Open client portal
              </ButtonLink>
            </div>
            <div className="mt-4 rounded-md border border-line bg-[#fbfaf7] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound size={15} className="text-teal" aria-hidden="true" />
                Link access
              </div>
              <p className="mt-2 text-xs leading-5 text-ink/60">
                The URL includes a long private code. Anyone with the URL can submit items for this packet.
              </p>
              <p className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-800">
                {SENSITIVE_UPLOAD_WARNING}
              </p>
              <dl className="mt-3 grid gap-2 border-t border-line pt-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink/50">Access</dt>
                  <dd className="font-semibold text-ink/70">Private URL</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink/50">Passcode</dt>
                  <dd className="font-semibold text-ink/70">Not required</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink/50">Expiration</dt>
                  <dd className="font-semibold text-ink/70">Not set</dd>
                </div>
              </dl>
            </div>
            {notice ? <p className="mt-3 text-sm font-medium text-ink/60">{notice}</p> : null}
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Activity</p>
            <div className="mt-4">
              {logs.length ? (
                logs.map((log, index) => (
                  <div key={log.id} className="relative grid grid-cols-[18px_1fr] gap-3 pb-4 last:pb-0">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-teal" : "bg-line"}`} />
                    <div>
                      <p className="text-sm font-medium leading-5">{log.message}</p>
                      <p className="mt-1 text-xs text-ink/50">{formatActivityTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-line p-4 text-sm text-ink/60">No activity yet.</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Assets</p>
            <div className="mt-4 grid gap-3">
              {submissions.length ? (
                submissions.map((submission) => (
                  <SubmissionView key={submission.id} submissionId={submission.id} compact onDelete={removeSubmission} />
                ))
              ) : (
                <EmptyState title="No submissions" description="Client uploads, text, links, and approvals will appear here." />
              )}
            </div>
          </Card>

          <Card className="border-rose-200 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-rose" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-rose">Danger zone</p>
                <h2 className="mt-2 text-lg font-semibold">Delete project</h2>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  Deletes this packet, checklist, activity, submissions, and uploaded files.
                </p>
              </div>
            </div>
            <Button className="mt-4 w-full" variant="danger" onClick={() => void removeProject()}>
              <Trash2 size={16} aria-hidden="true" />
              Delete project
            </Button>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

function SubmissionView({
  submissionId,
  compact = false,
  onDelete
}: {
  submissionId: string;
  compact?: boolean;
  onDelete?: (submissionId: string) => void;
}) {
  const { state } = useProjectPacket();
  const submission = state.submissions.find((candidate) => candidate.id === submissionId);
  const item = state.checklistItems.find((candidate) => candidate.id === submission?.checklistItemId);
  const colorLike = isColorItem(item?.title, item?.description);
  const colors = colorLike ? parseColorSwatches(submission?.textValue) : [];
  const invalidColors = colorLike ? invalidHexTokens(submission?.textValue) : [];
  const [signedUrl, setSignedUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!submission?.filePath || submission.fileDataUrl) {
      return;
    }

    let cancelled = false;

    async function signFile() {
      try {
        const response = await fetch(`/api/files/sign?path=${encodeURIComponent(submission?.filePath ?? "")}`, {
          headers: await getBearerAuthHeaders()
        });

        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as { url?: string };

        if (!cancelled && body.url) {
          setSignedUrl(body.url);
        }
      } catch {
        return;
      }
    }

    void signFile();

    return () => {
      cancelled = true;
    };
  }, [submission?.fileDataUrl, submission?.filePath]);

  const currentSubmission = submission;

  if (!currentSubmission) {
    return null;
  }

  const fileUrl = currentSubmission.fileDataUrl || signedUrl;
  const previewKind = getPreviewKind(currentSubmission.fileName);
  const hasLongText = (currentSubmission.textValue?.length ?? 0) > 700;

  async function openPreview(fileSubmission: NonNullable<typeof currentSubmission>) {
    setPreviewError("");
    setPreviewUrl("");
    setIsPreviewOpen(true);

    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    if (fileSubmission.fileDataUrl) {
      setPreviewUrl(fileSubmission.fileDataUrl);
      return;
    }

    if (!fileSubmission.filePath) {
      setPreviewError("File is not ready to preview.");
      return;
    }

    setIsPreviewLoading(true);

    try {
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(fileSubmission.filePath)}`, {
        headers: await getBearerAuthHeaders()
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Could not open file.");
      }

      const blob = await response.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (caught) {
      setPreviewError(caught instanceof Error ? caught.message : "Could not open file.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function downloadFile(fileSubmission: NonNullable<typeof currentSubmission>) {
    setDownloadError("");

    if (fileSubmission.fileDataUrl) {
      triggerBrowserDownload(fileSubmission.fileDataUrl, fileSubmission.fileName ?? "projectpacket-file");
      return;
    }

    if (!fileSubmission.filePath) {
      setDownloadError("File is not ready to download.");
      return;
    }

    try {
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(fileSubmission.filePath)}`, {
        headers: await getBearerAuthHeaders()
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Could not download file.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerBrowserDownload(objectUrl, fileSubmission.fileName ?? "projectpacket-file");
      URL.revokeObjectURL(objectUrl);
    } catch (caught) {
      setDownloadError(caught instanceof Error ? caught.message : "Could not download file.");
    }
  }

  return (
    <div className="rounded-md border border-line bg-[#fbfaf7] p-3 text-sm">
      {currentSubmission.fileName && (fileUrl || currentSubmission.filePath) ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-semibold">{currentSubmission.fileName}</p>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold text-teal hover:underline"
            onClick={() => void openPreview(currentSubmission)}
          >
            <ExternalLink size={14} aria-hidden="true" />
            Open
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold text-teal hover:underline"
            onClick={() => void downloadFile(currentSubmission)}
          >
            <Download size={14} aria-hidden="true" />
            Download
          </button>
          {onDelete ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-rose hover:underline"
              onClick={() => onDelete(currentSubmission.id)}
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
      {downloadError ? <p className="mt-2 text-xs font-semibold text-rose">{downloadError}</p> : null}
      {currentSubmission.textValue ? (
        <div className="grid gap-3">
          {colors.length ? <ColorSwatches colors={colors} /> : null}
          {invalidColors.length ? (
            <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
              Check color value: {invalidColors.join(", ")}
            </p>
          ) : null}
          <div className="grid gap-2">
            <p className={`break-words whitespace-pre-wrap font-medium leading-6 ${!isExpanded && hasLongText ? "max-h-40 overflow-hidden" : ""}`}>
              {currentSubmission.textValue}
            </p>
            {hasLongText ? (
              <button
                type="button"
                className="justify-self-start text-xs font-semibold text-teal hover:underline"
                onClick={() => setIsExpanded((previous) => !previous)}
              >
                {isExpanded ? "Show less" : "Show more"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {currentSubmission.linkValue ? (
        <a className="break-all font-semibold text-teal hover:underline" href={currentSubmission.linkValue} target="_blank" rel="noreferrer">
          {currentSubmission.linkValue}
        </a>
      ) : null}
      {currentSubmission.approvedValue ? <p className="font-semibold text-emerald-700">Client approved this item.</p> : null}
      {currentSubmission.acceptedCreativeAssetOnly ? (
        <p className="mt-2 text-xs font-semibold text-ink/50">
          Creative asset agreement accepted
          {currentSubmission.acceptedCreativeAssetOnlyAt ? ` ${formatActivityTime(currentSubmission.acceptedCreativeAssetOnlyAt)}` : ""}.
        </p>
      ) : null}
      {currentSubmission.clientComment ? <p className={`${compact ? "mt-1" : "mt-2"} text-xs text-ink/60`}>{currentSubmission.clientComment}</p> : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink/40">{formatActivityTime(currentSubmission.submittedAt)}</p>
        {onDelete && !currentSubmission.fileName ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose hover:underline"
            onClick={() => onDelete(currentSubmission.id)}
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete
          </button>
        ) : null}
      </div>
      {isPreviewOpen ? (
        <FilePreviewModal
          fileName={currentSubmission.fileName ?? "File"}
          fileUrl={previewUrl}
          error={previewError}
          isLoading={isPreviewLoading}
          previewKind={previewKind}
          onClose={() => setIsPreviewOpen(false)}
          onDownload={() => void downloadFile(currentSubmission)}
        />
      ) : null}
    </div>
  );
}

function FilePreviewModal({
  fileName,
  fileUrl,
  error,
  isLoading,
  previewKind,
  onClose,
  onDownload
}: {
  fileName: string;
  fileUrl: string;
  error: string;
  isLoading: boolean;
  previewKind: "image" | "document" | "unsupported";
  onClose: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-[2px]">
      <section className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_70px_rgba(31,36,33,0.24)]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="min-w-0 truncate text-sm font-semibold">{fileName}</p>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="secondary" className="min-h-9 px-3" onClick={onDownload}>
              <Download size={14} aria-hidden="true" />
              Download
            </Button>
            <button
              type="button"
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md text-ink/50 hover:bg-black/[0.045] hover:text-ink"
              onClick={onClose}
              aria-label="Close preview"
            >
              x
            </button>
          </div>
        </div>
        <div className="min-h-[320px] overflow-auto bg-[#fbfaf7] p-4">
          {isLoading ? (
            <div className="grid min-h-[320px] place-items-center text-sm font-semibold text-ink/60">
              Opening preview...
            </div>
          ) : null}
          {error && !isLoading ? (
            <div className="mx-auto grid max-w-md place-items-center rounded-md border border-orange-200 bg-orange-50 px-6 py-10 text-center">
              <p className="text-base font-semibold text-orange-800">Could not open preview.</p>
              <p className="mt-2 text-sm leading-6 text-orange-700">{error}</p>
              <Button type="button" className="mt-5" onClick={onDownload}>
                <Download size={16} aria-hidden="true" />
                Download file
              </Button>
            </div>
          ) : null}
          {previewKind === "image" && fileUrl && !error && !isLoading ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="mx-auto max-h-[68vh] max-w-full rounded-md border border-line bg-white object-contain" src={fileUrl} alt={fileName} />
          ) : null}
          {previewKind === "document" && fileUrl && !error && !isLoading ? (
            <iframe className="h-[68vh] w-full rounded-md border border-line bg-white" src={fileUrl} title={fileName} />
          ) : null}
          {previewKind === "unsupported" && !error && !isLoading ? (
            <div className="mx-auto grid max-w-md place-items-center rounded-md border border-dashed border-line bg-white px-6 py-12 text-center">
              <p className="text-base font-semibold">Preview is not available for this file type.</p>
              <p className="mt-2 break-all text-sm leading-6 text-ink/60">{fileName}</p>
              <Button type="button" className="mt-5" onClick={onDownload}>
                <Download size={16} aria-hidden="true" />
                Download file
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function getPreviewKind(fileName?: string): "image" | "document" | "unsupported" {
  const extension = fileName?.split(".").pop()?.toLowerCase() ?? "";

  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(extension)) {
    return "image";
  }

  if (["pdf", "txt"].includes(extension)) {
    return "document";
  }

  return "unsupported";
}

function triggerBrowserDownload(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function ColorSwatches({ colors }: { colors: Array<{ label: string; value: string }> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <span key={`${color.label}-${color.value}`} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-2">
          <span className="h-4 w-4 rounded-sm border border-black/10" style={{ backgroundColor: color.value }} />
          <span className="text-xs font-semibold text-ink/70">{color.label}</span>
          <span className="font-mono text-xs text-ink/50">{color.value}</span>
        </span>
      ))}
    </div>
  );
}
