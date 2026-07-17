"use client";

import Link from "next/link";
import { Mail, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/src/legal";
import { canUseClientEmail, formatCustomTemplateLimit, formatPlanLimit, getCustomTemplateLimit, getPlanLimit } from "@/src/plans";
import { useProjectPacket } from "@/src/store";

export default function BillingPage() {
  const { currentUser, getUserProjects, state } = useProjectPacket();
  const subscription = state.subscriptions.find((candidate) => candidate.userId === currentUser?.id);
  const plan = subscription?.plan ?? "free";
  const packetLimit = getPlanLimit(plan);
  const customTemplateLimit = getCustomTemplateLimit(plan);
  const packetCount = getUserProjects().length;
  const customTemplateCount = state.templates.filter(
    (template) => template.userId === currentUser?.id && isCustomTemplate(template.id)
  ).length;
  const emailIncluded = canUseClientEmail(plan);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Billing"
        title="Plan and usage"
        description="ProjectPacket uses packet slots. Completed packets still use a slot until you delete them."
        action={<ButtonLink href="/upgrade">Upgrade</ButtonLink>}
      />
      <div className="mx-auto grid max-w-[1200px] min-w-0 gap-6 px-4 pb-8 sm:px-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Current plan</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold capitalize">{plan}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/60">
                  Manual billing for now. Stripe can be added later when upgrades are ready to be automated.
                </p>
              </div>
              <ButtonLink href="/upgrade">
                <Sparkles size={16} aria-hidden="true" />
                Compare plans
              </ButtonLink>
            </div>
          </Card>

          <UsageCard
            title="Packet slots"
            used={packetCount}
            limit={packetLimit}
            limitLabel={formatPlanLimit(plan)}
            note="Only deleting a packet frees a slot. Marking a packet complete keeps it saved and still counts."
          />

          <UsageCard
            title="Custom templates"
            used={customTemplateCount}
            limit={customTemplateLimit}
            limitLabel={formatCustomTemplateLimit(plan)}
            note="The four starter templates stay available. This count is for templates you create."
          />
        </div>

        <aside className="grid gap-5 self-start">
          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Paid features</p>
            <h2 className="mt-2 text-lg font-semibold">Client emails</h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">
              Status: <span className="font-semibold text-ink">{emailIncluded ? "Included" : "Starter and above"}</span>
            </p>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Paid plans can send invite, reminder, and completion emails from the packet page.
            </p>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Upgrade support</p>
            <h2 className="mt-2 text-lg font-semibold">Manual upgrade</h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">
              Until Stripe is added, upgrades happen by changing the plan in Supabase after contact.
            </p>
            <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal hover:underline" href={`mailto:${SUPPORT_EMAIL}?subject=Upgrade ProjectPacket`}>
              <Mail size={15} aria-hidden="true" />
              Contact support
            </a>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-medium text-ink/50">Account</p>
            <h2 className="mt-2 text-lg font-semibold">Workspace settings</h2>
            <p className="mt-3 text-sm leading-6 text-ink/60">
              Change your business name and brand color in Settings.
            </p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-teal hover:underline" href="/settings">
              Open settings
            </Link>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

function UsageCard({
  title,
  used,
  limit,
  limitLabel,
  note
}: {
  title: string;
  used: number;
  limit: number | null;
  limitLabel: string;
  note: string;
}) {
  const percent = limit === null ? 42 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink/50">{title}</p>
          <h2 className="mt-2 text-xl font-semibold">{used}{limit === null ? "" : `/${limit}`} used</h2>
          <p className="mt-1 text-sm text-ink/60">{limitLabel}</p>
        </div>
        {limit !== null && used >= limit ? (
          <ButtonLink href="/upgrade" className="shrink-0">
            Upgrade
          </ButtonLink>
        ) : null}
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-line">
        <span className="block h-full rounded-full bg-[var(--brand-color)]" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/60">{note}</p>
    </Card>
  );
}

function isCustomTemplate(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
