"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardCopy, Download, ExternalLink, KeyRound, MailPlus, Pencil, RotateCcw, ShieldCheck, Trash2, X, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AssetIcon } from "@/components/AssetIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, ButtonLink, Card, EmptyState, Field, inputClass, PageHeader, textareaClass } from "@/components/ui";
import { formatActivityTime } from "@/src/activity";
import { invalidHexTokens, isColorItem, parseColorSwatches } from "@/src/colors";
import { SENSITIVE_UPLOAD_WARNING } from "@/src/file-safety";
import { SUPPORT_EMAIL } from "@/src/legal";
import { canUseClientEmail, EMAIL_UPGRADE_MESSAGE } from "@/src/plans";
import { formatDate, useProjectPacket } from "@/src/store";
import { getBearerAuthHeaders } from "@/src/supabase/browser-auth";

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const {
    state,
    currentUser,
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
    refreshWorkspace
  } = useProjectPacket();
  const [notice, setNotice] = useState("");
  const [showEmailUpgrade, setShowEmailUpgrade] = useState(false);
  const [changeRequest, setChangeRequest] = useState<{
    itemId: string;
    title: string;
    note: string;
  } | null>(null);
  const [editDetails, setEditDetails] = useState<{
    name: string;
    clientName: string;
    clientEmail: string;
    dueDate: string;
  } | null>(null);
  const [accessSettings, setAccessSettings] = useState<{
    accessPasscode: string;
    clearPasscode: boolean;
    expiresAt: string;
  } | null>(null);
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
  const subscription = state.subscriptions.find((candidate) => candidate.userId === currentUser?.id);
  const emailIncluded = canUseClientEmail(subscription?.plan);
  const requiredItems = items.filter((item) => item.required);
  const readyToComplete =
    requiredItems.length > 0 &&
    requiredItems.every((item) => ["approved", "waived"].includes(item.status));
  const isCompleted = project.status === "completed";
  // Client portals use an unguessable share token rather than the project id.
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

  async function submitChangeRequest() {
    if (!changeRequest) {
      return;
    }

    const note = changeRequest.note.trim();

    if (!note) {
      setNotice("Add a note before requesting changes.");
      return;
    }

    await saveStatus(changeRequest.itemId, "changes_requested", note);
    setChangeRequest(null);
  }

  function openChangeRequestModal(itemId: string, title: string, existingNote = "") {
    setNotice("");
    setChangeRequest({
      itemId,
      title,
      note: existingNote || "Please update this asset and resubmit it."
    });
  }

  function openEditDetailsModal() {
    if (!project) {
      return;
    }

    setNotice("");
    setEditDetails({
      name: project.name,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
      dueDate: project.dueDate
    });
  }

  function openAccessSettingsModal() {
    if (!project) {
      return;
    }

    setNotice("");
    setAccessSettings({
      accessPasscode: "",
      clearPasscode: false,
      expiresAt: project.expiresAt ? toDateTimeLocal(project.expiresAt) : ""
    });
  }

  async function saveProjectDetails() {
    if (!editDetails) {
      return;
    }

    setNotice("");

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await getBearerAuthHeaders())
        },
        body: JSON.stringify(editDetails)
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not update packet details.");
      }

      await refreshWorkspace();
      setEditDetails(null);
      setNotice("Packet details updated.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not update packet details.");
    }
  }

  async function saveAccessSettings() {
    if (!accessSettings) {
      return;
    }

    setNotice("");

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await getBearerAuthHeaders())
        },
        body: JSON.stringify({
          accessPasscode: accessSettings.accessPasscode,
          clearPasscode: accessSettings.clearPasscode,
          expiresAt: accessSettings.expiresAt ? new Date(accessSettings.expiresAt).toISOString() : null
        })
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not update client link access.");
      }

      await refreshWorkspace();
      setAccessSettings(null);
      setNotice("Client link access updated.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not update client link access.");
    }
  }

  async function draftReminder() {
    try {
      await sendProjectEmail("reminder");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not send reminder.");
    }
  }

  async function sendProjectEmail(type: "invite" | "reminder" | "completion") {
    setNotice("");

    try {
      const response = await fetch(`/api/projects/${projectId}/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getBearerAuthHeaders())
        },
        body: JSON.stringify({ type })
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        if (body?.error === EMAIL_UPGRADE_MESSAGE) {
          setShowEmailUpgrade(true);
          return;
        }

        throw new Error(body?.error ?? "Could not send email.");
      }

      await refreshWorkspace();
      setNotice(body?.message ?? "Email sent.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not send email.");
    }
  }

  async function saveProjectStatus(status: "completed" | "in_progress") {
    setNotice("");

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(await getBearerAuthHeaders())
        },
        body: JSON.stringify({ status })
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not update packet status.");
      }

      await refreshWorkspace();

      if (status === "completed") {
        setNotice("Packet marked complete.");

        if (emailIncluded) {
          await sendProjectEmail("completion");
        }
      } else {
        setNotice("Packet reopened.");
      }
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not update packet status.");
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
            <Button variant="secondary" onClick={openEditDetailsModal}>
              <Pencil size={16} aria-hidden="true" />
              Edit
            </Button>
            <Button variant="secondary" onClick={() => void sendProjectEmail("invite")}>
              <MailPlus size={16} aria-hidden="true" />
              Email invite
            </Button>
            <Button onClick={() => void draftReminder()}>
              <MailPlus size={16} aria-hidden="true" />
              Reminder
            </Button>
          </>
        }
      />

      <div className="grid min-w-0 gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5">
          <Card className="min-w-0 overflow-hidden">
            <div className="grid gap-5 border-b border-line bg-[#fbfaf7] p-5 lg:grid-cols-[1fr_240px] lg:items-center">
              <div>
                <p className="text-sm font-medium text-ink/50">{submissions.length} submissions received</p>
                <h2 className="mt-3 text-xl font-semibold">Review checklist</h2>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  {isCompleted
                    ? "This packet is complete. Reopen it before changing client submissions."
                    : "Approve what is ready, request cleaner resubmits, or waive items you no longer need."}
                </p>
                {!isCompleted && readyToComplete ? (
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-teal">
                    <CheckCircle2 size={15} /> All required items are approved or waived.
                  </p>
                ) : null}
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
                const canApprove = Boolean(submission) && ["submitted", "changes_requested"].includes(item.status);
                const canRequestChanges =
                  item.status === "approved" ||
                  (Boolean(submission) && ["submitted", "changes_requested"].includes(item.status));
                const reopenStatus = submission ? "submitted" : "requested";

                return (
                  <article key={item.id} className="grid gap-4 px-5 py-4 transition hover:bg-[#fafbf8] lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <AssetIcon type={item.type} isColor={isColorItem(item.title, item.description)} />
                      <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h3 className="font-semibold">{item.title}</h3>
                        <StatusBadge status={item.status} />
                        {!item.required ? <span className="text-xs text-ink/38">Optional</span> : null}
                      </div>
                      {item.description ? <p className="mt-2 text-sm leading-6 text-ink/60">{item.description}</p> : null}
                      {item.changeRequestNote ? (
                        <p className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm leading-6 text-orange-800">
                          Change requested: {item.changeRequestNote}
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
                    </div>
                    <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-3 text-xs"
                        disabled={isCompleted || !canApprove}
                        onClick={() => void saveStatus(item.id, "approved")}
                      >
                        <CheckCircle2 size={15} aria-hidden="true" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-3 text-xs"
                        disabled={isCompleted || !canRequestChanges}
                        onClick={() => openChangeRequestModal(item.id, item.title, item.changeRequestNote)}
                      >
                        <XCircle size={15} aria-hidden="true" />
                        Changes
                      </Button>
                      {item.status === "waived" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-9 px-3 text-xs"
                          disabled={isCompleted}
                          onClick={() => void saveStatus(item.id, reopenStatus)}
                        >
                          <RotateCcw size={15} aria-hidden="true" />
                          Reopen
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-9 px-3 text-xs"
                          disabled={isCompleted}
                          onClick={() => void saveStatus(item.id, "waived")}
                        >
                          <ShieldCheck size={15} aria-hidden="true" />
                          Waive
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </Card>
        </div>

        <aside className="grid min-w-0 gap-5 self-start">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink/50">Packet info</p>
                <h2 className="mt-2 text-lg font-semibold">{project.clientName}</h2>
              </div>
              <Button type="button" variant="ghost" className="min-h-9 px-3" onClick={openEditDetailsModal}>
                <Pencil size={15} aria-hidden="true" />
                Edit
              </Button>
            </div>
            <dl className="mt-4 grid gap-2 border-t border-line pt-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-ink/50">Email</dt>
                <dd className="break-all text-right font-semibold text-ink/70">{project.clientEmail}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink/50">Due</dt>
                <dd className="font-semibold text-ink/70">{formatDate(project.dueDate)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Client link</p>
            <h2 className="mt-2 text-lg font-semibold">Send this once</h2>
            <p className="mt-3 break-all rounded-md border border-line bg-[#fbfaf7] p-3 font-mono text-xs leading-6 text-ink/60">
              {uploadPath}
            </p>
            <div className="mt-4 grid gap-2">
              <Button onClick={copyLink}>
                <ClipboardCopy size={16} aria-hidden="true" />
                Copy link
              </Button>
              <Button variant="secondary" onClick={() => void sendProjectEmail("invite")}>
                <MailPlus size={16} aria-hidden="true" />
                Email invite
              </Button>
              <ButtonLink href={uploadPath} variant="secondary">
                Open client portal
              </ButtonLink>
              <Button variant="secondary" onClick={openAccessSettingsModal}>
                <KeyRound size={16} aria-hidden="true" />
                Access settings
              </Button>
            </div>
            <div className="mt-4 rounded-md border border-line bg-[#fbfaf7] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound size={15} className="text-teal" aria-hidden="true" />
                Link access
              </div>
              <p className="mt-2 text-xs leading-5 text-ink/60">
                The URL includes a long private code. Add a passcode or expiration when the packet should be more locked down.
              </p>
              <p className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-800">
                Creative assets only. {SENSITIVE_UPLOAD_WARNING}
              </p>
              <dl className="mt-3 grid gap-2 border-t border-line pt-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink/50">Access</dt>
                  <dd className="font-semibold text-ink/70">Private URL</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink/50">Passcode</dt>
                  <dd className="font-semibold text-ink/70">{project.hasPasscode ? "Required" : "Not required"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink/50">Expiration</dt>
                  <dd className="text-right font-semibold text-ink/70">{project.expiresAt ? new Date(project.expiresAt).toLocaleString() : "Not set"}</dd>
                </div>
              </dl>
            </div>
            {notice ? <p className="mt-3 text-sm font-medium text-ink/60">{notice}</p> : null}
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Completion</p>
            <h2 className="mt-2 text-lg font-semibold">{isCompleted ? "Packet complete" : readyToComplete ? "Ready to complete" : "Still in progress"}</h2>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              {isCompleted
                ? "Completed packets still use a packet slot until deleted."
                : readyToComplete
                  ? "Mark this complete when you are done reviewing the required items."
                  : "Approve or waive every required item before completing this packet."}
            </p>
            {isCompleted ? (
              <Button className="mt-4 w-full" variant="secondary" onClick={() => void saveProjectStatus("in_progress")}>
                <RotateCcw size={16} aria-hidden="true" />
                Reopen packet
              </Button>
            ) : (
              <Button className="mt-4 w-full" disabled={!readyToComplete} onClick={() => void saveProjectStatus("completed")}>
                <CheckCircle2 size={16} aria-hidden="true" />
                Mark complete
              </Button>
            )}
            <p className="mt-3 text-xs leading-5 text-ink/50">
              Email sending is {emailIncluded ? "included on your plan" : "a Starter+ perk"}.
            </p>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <div className="border-b border-line p-5 pb-4">
              <p className="text-sm font-semibold">Activity</p>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-5">
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

          <Card className="min-w-0 overflow-hidden">
            <div className="border-b border-line p-5 pb-4">
              <p className="text-sm font-semibold">All submissions</p>
            </div>
            <div className="grid max-h-[360px] gap-3 overflow-y-auto p-5">
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
      {changeRequest ? (
        <ChangeRequestModal
          note={changeRequest.note}
          title={changeRequest.title}
          onChange={(note) => setChangeRequest((previous) => previous ? { ...previous, note } : previous)}
          onClose={() => setChangeRequest(null)}
          onSubmit={() => void submitChangeRequest()}
        />
      ) : null}
      {showEmailUpgrade ? (
        <EmailUpgradeModal onClose={() => setShowEmailUpgrade(false)} />
      ) : null}
      {editDetails ? (
        <EditPacketDetailsModal
          details={editDetails}
          onChange={setEditDetails}
          onClose={() => setEditDetails(null)}
          onSubmit={() => void saveProjectDetails()}
        />
      ) : null}
      {accessSettings ? (
        <PacketAccessModal
          settings={accessSettings}
          hasExistingPasscode={Boolean(project.hasPasscode)}
          onChange={setAccessSettings}
          onClose={() => setAccessSettings(null)}
          onSubmit={() => void saveAccessSettings()}
        />
      ) : null}
    </AppShell>
  );
}

function PacketAccessModal({
  settings,
  hasExistingPasscode,
  onChange,
  onClose,
  onSubmit
}: {
  settings: {
    accessPasscode: string;
    clearPasscode: boolean;
    expiresAt: string;
  };
  hasExistingPasscode: boolean;
  onChange: (settings: {
    accessPasscode: string;
    clearPasscode: boolean;
    expiresAt: string;
  }) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-[2px]">
      <section
        aria-labelledby="packet-access-title"
        aria-modal="true"
        role="dialog"
        className="w-full max-w-[520px] overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_70px_rgba(31,36,33,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-medium text-ink/50">Client link</p>
            <h2 id="packet-access-title" className="mt-2 text-xl font-semibold text-ink">
              Access settings
            </h2>
          </div>
          <button
            aria-label="Close access settings modal"
            className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink/50 hover:bg-black/[0.045] hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form
          className="grid gap-4 px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Field
            label={hasExistingPasscode ? "New passcode" : "Passcode"}
            hint={hasExistingPasscode ? "Leave blank to keep the current passcode." : "Optional. Use 4-32 characters."}
          >
            <input
              className={inputClass}
              minLength={settings.accessPasscode ? 4 : undefined}
              maxLength={32}
              value={settings.accessPasscode}
              onChange={(event) => onChange({ ...settings, accessPasscode: event.target.value, clearPasscode: false })}
              placeholder={hasExistingPasscode ? "Keep current passcode" : "Example: client123"}
            />
          </Field>
          {hasExistingPasscode ? (
            <label className="flex items-start gap-3 rounded-md border border-line bg-[#fbfaf7] p-3 text-sm font-semibold">
              <input
                className="mt-1"
                type="checkbox"
                checked={settings.clearPasscode}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    clearPasscode: event.target.checked,
                    accessPasscode: event.target.checked ? "" : settings.accessPasscode
                  })
                }
              />
              Remove the current passcode
            </label>
          ) : null}
          <Field label="Expiration" hint="Optional. After this time, clients cannot view or submit this packet.">
            <input
              className={inputClass}
              type="datetime-local"
              value={settings.expiresAt}
              onChange={(event) => onChange({ ...settings, expiresAt: event.target.value })}
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save access
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function EditPacketDetailsModal({
  details,
  onChange,
  onClose,
  onSubmit
}: {
  details: {
    name: string;
    clientName: string;
    clientEmail: string;
    dueDate: string;
  };
  onChange: (details: {
    name: string;
    clientName: string;
    clientEmail: string;
    dueDate: string;
  }) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-[2px]">
      <section
        aria-labelledby="edit-packet-title"
        aria-modal="true"
        role="dialog"
        className="w-full max-w-[520px] overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_70px_rgba(31,36,33,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-medium text-ink/50">Packet info</p>
            <h2 id="edit-packet-title" className="mt-2 text-xl font-semibold text-ink">
              Edit packet details
            </h2>
          </div>
          <button
            aria-label="Close edit packet modal"
            className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink/50 hover:bg-black/[0.045] hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form
          className="grid gap-4 px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <Field label="Project name">
            <input
              className={inputClass}
              value={details.name}
              onChange={(event) => onChange({ ...details, name: event.target.value })}
              required
            />
          </Field>
          <Field label="Client name">
            <input
              className={inputClass}
              value={details.clientName}
              onChange={(event) => onChange({ ...details, clientName: event.target.value })}
              required
            />
          </Field>
          <Field label="Client email">
            <input
              className={inputClass}
              type="email"
              value={details.clientEmail}
              onChange={(event) => onChange({ ...details, clientEmail: event.target.value })}
              required
            />
          </Field>
          <Field label="Due date">
            <input
              className={inputClass}
              type="date"
              value={details.dueDate}
              onChange={(event) => onChange({ ...details, dueDate: event.target.value })}
              required
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save details
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function EmailUpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-[2px]">
      <section
        aria-labelledby="email-upgrade-title"
        aria-modal="true"
        role="dialog"
        className="w-full max-w-[460px] overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_70px_rgba(31,36,33,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-medium text-ink/50">Paid email</p>
            <h2 id="email-upgrade-title" className="mt-2 text-xl font-semibold text-ink">
              Send client emails on Starter
            </h2>
          </div>
          <button
            aria-label="Close email upgrade modal"
            className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink/50 hover:bg-black/[0.045] hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm leading-6 text-ink/65">
            Free includes copy links. Starter adds client invite emails, reminder emails, and completion emails.
          </p>
          <div className="mt-4 overflow-hidden rounded-md border border-line text-sm">
            {[
              ["Free", "Copy links"],
              ["Starter", "5 packets + client emails"],
              ["Pro", "25 packets + client emails"],
              ["Studio", "Unlimited packets + branding + client emails"]
            ].map(([plan, detail], index) => (
              <div
                key={plan}
                className={`grid gap-1 px-3 py-3 sm:grid-cols-[110px_1fr] sm:items-center ${
                  index > 0 ? "border-t border-line" : ""
                } ${plan === "Starter" ? "bg-teal/[0.06]" : "bg-white"}`}
              >
                <span className="font-semibold text-ink">{plan}</span>
                <span className="text-ink/60">{detail}</span>
              </div>
            ))}
          </div>
          <ButtonLink href="/upgrade" className="mt-5 w-full">
            Compare plans
          </ButtonLink>
          <a className="mt-3 inline-flex w-full justify-center text-sm font-semibold text-teal hover:underline" href={`mailto:${SUPPORT_EMAIL}?subject=Upgrade ProjectPacket`}>
            Contact support to upgrade
          </a>
        </div>
      </section>
    </div>
  );
}

function ChangeRequestModal({
  title,
  note,
  onChange,
  onClose,
  onSubmit
}: {
  title: string;
  note: string;
  onChange: (note: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-[2px]">
      <section
        aria-labelledby="change-request-title"
        aria-modal="true"
        role="dialog"
        className="w-full max-w-[480px] overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_70px_rgba(31,36,33,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-xs font-medium text-ink/50">Request changes</p>
            <h2 id="change-request-title" className="mt-2 text-xl font-semibold text-ink">
              Send feedback for {title}
            </h2>
          </div>
          <button
            aria-label="Close request changes modal"
            className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink/50 hover:bg-black/[0.045] hover:text-ink"
            type="button"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5">
          <label className="grid gap-2 text-sm font-medium text-ink">
            Note for the client
            <textarea
              className={textareaClass}
              value={note}
              onChange={(event) => onChange(event.target.value)}
              required
            />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onSubmit} disabled={!note.trim()}>
              Request changes
            </Button>
          </div>
        </div>
      </section>
    </div>
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

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
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
