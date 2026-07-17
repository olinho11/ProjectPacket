"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/src/legal";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "For testing the workflow with one client packet.",
    features: ["1 packet slot", "4 starter templates", "2 custom templates", "Copy-link workflow"]
  },
  {
    name: "Starter",
    price: "$9/mo",
    description: "For freelancers who run a few active client handoffs.",
    features: ["5 packet slots", "Unlimited templates", "Client invite emails", "Reminder and completion emails"],
    highlighted: true
  },
  {
    name: "Pro",
    price: "$19/mo",
    description: "For freelancers with client work every week.",
    features: ["25 packet slots", "Unlimited templates", "Client emails", "More room for retained clients"]
  },
  {
    name: "Agency",
    price: "$39/mo",
    description: "For small teams or studios with many handoffs.",
    features: ["Unlimited packet slots", "Unlimited templates", "Client emails", "Best for repeated production work"]
  }
];

export default function UpgradePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Upgrade"
        title="More packet slots, fewer client chases"
        description="Upgrade when one saved packet is not enough. Completed packets stay saved, so delete old packets or move to a larger plan."
        action={<ButtonLink href="/billing" variant="secondary">Back to billing</ButtonLink>}
      />
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 pb-8 sm:px-6 md:px-8">
        <section className="grid gap-4 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card key={plan.name} className={`grid gap-5 p-5 ${plan.highlighted ? "border-[var(--brand-color)] shadow-[0_0_0_1px_var(--brand-color)]" : ""}`}>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink/50">{plan.name}</p>
                  {plan.highlighted ? (
                    <span className="text-xs font-semibold text-teal">Recommended</span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-3xl font-semibold">{plan.price}</h2>
                <p className="mt-3 text-sm leading-6 text-ink/60">{plan.description}</p>
              </div>
              <ul className="grid gap-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--brand-color)]" size={16} aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.name === "Free" ? (
                <ButtonLink href="/projects/new" variant="secondary" className="mt-auto">
                  Keep Free
                </ButtonLink>
              ) : (
                <a
                  className="focus-ring mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--brand-color)] px-3.5 py-2 text-sm font-medium text-white transition hover:brightness-95"
                  href={`mailto:${SUPPORT_EMAIL}?subject=Upgrade ProjectPacket to ${plan.name}`}
                >
                  Contact support
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              )}
            </Card>
          ))}
        </section>

        <Card className="p-5">
          <p className="text-sm font-medium text-ink/50">How upgrades work right now</p>
          <h2 className="mt-2 text-lg font-semibold">Manual billing before Stripe</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/60">
            The app already reads the plan from Supabase. For now, upgrading means contacting support and manually changing the account plan. Stripe can plug into the same subscription table later.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
