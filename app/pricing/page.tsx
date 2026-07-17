import Link from "next/link";
import { ArrowRight, Check, Mail } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ButtonLink } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/src/legal";

const plans = [
  {
    name: "Free",
    price: "$0",
    detail: "Try the complete handoff with one real client.",
    features: ["1 packet slot", "4 starter templates", "2 custom templates", "Passcodes and expiry"],
    cta: "Start free",
    href: "/signup"
  },
  {
    name: "Starter",
    price: "$9",
    detail: "For freelancers managing a few active client handoffs.",
    features: ["5 packet slots", "Unlimited templates", "Client invite emails", "Reminder emails"],
    cta: "Choose Starter",
    href: `mailto:${SUPPORT_EMAIL}?subject=Upgrade ProjectPacket to Starter`,
    highlighted: true
  },
  {
    name: "Pro",
    price: "$19",
    detail: "For repeat client work happening every week.",
    features: ["25 packet slots", "Unlimited templates", "All client emails", "Room for retainers"],
    cta: "Choose Pro",
    href: `mailto:${SUPPORT_EMAIL}?subject=Upgrade ProjectPacket to Pro`
  },
  {
    name: "Agency",
    price: "$39",
    detail: "For small studios running many handoffs at once.",
    features: ["Unlimited packets", "Unlimited templates", "All client emails", "Studio-ready capacity"],
    cta: "Choose Agency",
    href: `mailto:${SUPPORT_EMAIL}?subject=Upgrade ProjectPacket to Agency`
  }
];

const questions = [
  ["Why not keep using email?", "Email hides what is still missing. ProjectPacket keeps the remaining request visible to you and your client."],
  ["Do clients need an account?", "No. They open a private link and submit the files, links, answers, and approvals you requested."],
  ["What counts as a packet slot?", "Every saved packet counts, including completed work. Delete an old packet when you no longer need its submissions."],
  ["Is this for sensitive documents?", "No. ProjectPacket is for creative assets such as logos, copy, photos, links, brand information, and approvals."]
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-[#fbfaf6]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="text-sm font-semibold">ProjectPacket</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-ink/60 transition hover:bg-black/[0.045] hover:text-ink sm:block">
              Log in
            </Link>
            <ButtonLink href="/signup">
              Start free
              <ArrowRight size={15} aria-hidden="true" />
            </ButtonLink>
          </nav>
        </div>
      </header>

      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="text-sm font-medium text-teal">Simple pricing</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              Spend less time chasing client assets.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink/60">
              Start with one packet for free. Upgrade when collecting files, copy, links, and approvals becomes part of your weekly work.
            </p>
          </div>
          <div className="rounded-md border border-line bg-[#fbfaf7] p-5">
            <p className="text-sm font-semibold">Not sure which plan fits?</p>
            <p className="mt-2 text-sm leading-6 text-ink/60">Tell us how many client handoffs you run at once.</p>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=ProjectPacket pricing question`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal hover:underline">
              <Mail size={15} aria-hidden="true" />
              Ask a pricing question
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid overflow-hidden rounded-md border border-line bg-white lg:grid-cols-4">
          {plans.map((plan, index) => (
            <article
              key={plan.name}
              className={`relative flex min-h-[480px] flex-col p-6 ${index ? "border-t border-line lg:border-l lg:border-t-0" : ""} ${plan.highlighted ? "bg-[#f0f8f5]" : ""}`}
            >
              {plan.highlighted ? <span className="absolute inset-x-0 top-0 h-1 bg-teal" /> : null}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{plan.name}</p>
                {plan.highlighted ? <span className="text-xs font-semibold text-teal">Recommended</span> : null}
              </div>
              <p className="mt-6 text-4xl font-semibold">
                {plan.price}
                <span className="ml-1 text-sm font-normal text-ink/45">/ month</span>
              </p>
              <p className="mt-4 min-h-20 text-sm leading-6 text-ink/60">{plan.detail}</p>
              <ul className="mt-6 grid gap-3 border-t border-line pt-5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0 text-teal" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                className={`focus-ring mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition ${plan.highlighted ? "bg-teal text-white hover:bg-[#0a5f58]" : "border border-line bg-white hover:border-ink/25 hover:bg-[#faf9f5]"}`}
              >
                {plan.cta}
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-md border border-line bg-[#fbfaf7] p-5 sm:flex sm:items-start sm:justify-between sm:gap-8">
          <div>
            <p className="text-sm font-semibold">How packet slots work</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
              Completed packets remain available for review and downloads, so they still count toward your saved capacity. Delete old packets when you are truly finished, or move to a larger plan.
            </p>
          </div>
          <Link href="/signup" className="mt-4 inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-teal hover:underline sm:mt-0">
            Create a free packet
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <p className="text-sm font-medium text-teal">Before you choose</p>
            <h2 className="mt-3 text-2xl font-semibold">Common questions</h2>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {questions.map(([question, answer]) => (
              <div key={question} className="grid gap-2 py-5 sm:grid-cols-[210px_minmax(0,1fr)] sm:gap-6">
                <h3 className="text-sm font-semibold">{question}</h3>
                <p className="text-sm leading-6 text-ink/60">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-12 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Start with your next client handoff.</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">One link for every file, note, and approval you still need.</p>
          </div>
          <ButtonLink href="/signup" className="w-fit bg-white text-ink hover:bg-[#f3f3ef]">
            Create a free packet
            <ArrowRight size={16} aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t border-line bg-[#fbfaf6]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 text-sm sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <BrandMark />
            ProjectPacket
          </Link>
          <Link href="/" className="text-ink/50 hover:text-ink">Back home</Link>
        </div>
      </footer>
    </main>
  );
}
