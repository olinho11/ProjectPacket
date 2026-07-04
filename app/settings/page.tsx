"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/src/legal";
import { canUseClientEmail, formatPlanLimit } from "@/src/plans";
import { useProjectPacket } from "@/src/store";

const colors = ["#2563eb", "#0f766e", "#f59e0b", "#e11d48"];

export default function SettingsPage() {
  const { currentUser, state, updateUser, getStats } = useProjectPacket();
  const subscription = state.subscriptions.find((candidate) => candidate.userId === currentUser?.id);
  const emailIncluded = canUseClientEmail(subscription?.plan);
  const stats = getStats();
  const [businessName, setBusinessName] = useState(currentUser?.businessName ?? "");
  const [brandColor, setBrandColor] = useState(currentUser?.brandColor ?? "#2563eb");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setIsSaving(true);

    try {
      await updateUser({ businessName, brandColor });
      setNotice("Settings saved.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage your workspace profile, plan, and support links."
      />
      <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="border-b border-line pb-4">
              <p className="text-sm font-medium text-ink/50">Identity</p>
              <h2 className="mt-2 text-lg font-semibold">Workspace profile</h2>
            </div>
            <Field label="Business name">
              <input className={inputClass} value={businessName} onChange={(event) => setBusinessName(event.target.value)} required />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={currentUser?.email ?? ""} disabled />
            </Field>
            <Field label="Brand color">
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-10 w-10 rounded-md border-2 ${brandColor === color ? "border-ink" : "border-line"}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setBrandColor(color)}
                    aria-label={`Use ${color}`}
                  />
                ))}
              </div>
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSaving}>
                <Save size={16} aria-hidden="true" />
                {isSaving ? "Saving..." : "Save settings"}
              </Button>
              {notice ? <p className="text-sm font-medium text-ink/60">{notice}</p> : null}
            </div>
          </form>
        </Card>

        <div className="grid gap-6 self-start">
          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Plan</p>
            <h2 className="mt-2 text-lg font-semibold">Current plan</h2>
            <p className="mt-3 text-3xl font-semibold capitalize">{subscription?.plan ?? "free"}</p>
            <p className="mt-2 text-sm text-ink/60">
              {stats.activeProjects} open packet{stats.activeProjects === 1 ? "" : "s"} · {formatPlanLimit(subscription?.plan)}
            </p>
            <p className="mt-2 rounded-md border border-line bg-[#fbfaf7] px-3 py-2 text-sm text-ink/60">
              Client email sending: <span className="font-semibold text-ink">{emailIncluded ? "Included" : "Starter and above"}</span>
            </p>
            <a className="mt-4 inline-flex text-sm font-semibold text-teal hover:underline" href={`mailto:${SUPPORT_EMAIL}?subject=Upgrade ProjectPacket`}>
              Contact support to upgrade
            </a>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Help</p>
            <h2 className="mt-2 text-lg font-semibold">Policies and support</h2>
            <div className="mt-4 grid gap-2 text-sm">
              <Link className="font-semibold text-teal hover:underline" href="/privacy">Privacy</Link>
              <Link className="font-semibold text-teal hover:underline" href="/terms">Terms</Link>
              <a className="font-semibold text-teal hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
