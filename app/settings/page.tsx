"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, ButtonLink, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { brandForeground, normalizeBrandColor } from "@/src/colors";
import { SUPPORT_EMAIL } from "@/src/legal";
import { useProjectPacket } from "@/src/store";

const colors = ["#2563eb", "#0f766e", "#f59e0b", "#e11d48"];

export default function SettingsPage() {
  const { currentUser, updateUser } = useProjectPacket();
  const [businessName, setBusinessName] = useState(currentUser?.businessName ?? "");
  const [brandColor, setBrandColor] = useState(normalizeBrandColor(currentUser?.brandColor));
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  useEffect(() => {
    if (!currentUser || hasLocalChanges) {
      return;
    }

    setBusinessName(currentUser.businessName);
    setBrandColor(normalizeBrandColor(currentUser.brandColor));
  }, [currentUser, hasLocalChanges]);

  function selectBrandColor(color: string) {
    setBrandColor(normalizeBrandColor(color));
    setHasLocalChanges(true);
    setNotice("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setIsSaving(true);

    try {
      await updateUser({ businessName, brandColor });
      setHasLocalChanges(false);
      setNotice("Settings saved.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell brandColor={brandColor}>
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage the name and accent color clients see on packet links."
      />
      <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="border-b border-line pb-4">
              <p className="text-sm font-medium text-ink/50">Identity</p>
              <h2 className="mt-2 text-lg font-semibold">Workspace profile</h2>
            </div>
            <Field label="Business name">
              <input
                className={inputClass}
                value={businessName}
                onChange={(event) => {
                  setBusinessName(event.target.value);
                  setHasLocalChanges(true);
                  setNotice("");
                }}
                required
              />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={currentUser?.email ?? ""} disabled />
            </Field>
            <Field label="Brand color">
              <div className="flex flex-wrap items-center gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-10 w-10 rounded-md border-2 disabled:cursor-not-allowed disabled:opacity-50 ${brandColor === color ? "border-ink" : "border-line"}`}
                    style={{ backgroundColor: color }}
                    onClick={() => selectBrandColor(color)}
                    aria-pressed={brandColor === color}
                    aria-label={`Use ${color}`}
                    disabled={isSaving}
                  />
                ))}
                <input
                  className="h-10 w-14 cursor-pointer rounded-md border border-line bg-white p-1"
                  type="color"
                  value={brandColor}
                  onInput={(event) => selectBrandColor(event.currentTarget.value)}
                  aria-label="Choose custom brand color"
                  disabled={isSaving}
                />
              </div>
              <div className="mt-2 rounded-md border border-line bg-[#fbfaf7] p-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold"
                    style={{ backgroundColor: brandColor, color: brandForeground(brandColor) }}
                  >
                    PP
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{businessName || "Your workspace"}</p>
                    <p className="text-xs text-ink/50">This accent appears in your app and client portal.</p>
                  </div>
                </div>
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

        <div className="grid gap-5 self-start">
          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Billing</p>
            <h2 className="mt-2 text-lg font-semibold">Plan and usage</h2>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Billing, packet slots, template limits, and upgrade options now live on a dedicated page.
            </p>
            <ButtonLink href="/billing" className="mt-4 w-full">
              <CreditCard size={16} aria-hidden="true" />
              Open billing
            </ButtonLink>
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
