"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  FileText,
  Link2,
  MessageSquare,
  Palette,
  Send,
  UploadCloud,
  type LucideIcon
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ButtonLink } from "@/components/ui";
import { SENSITIVE_UPLOAD_WARNING } from "@/src/file-safety";
import { SUPPORT_EMAIL } from "@/src/legal";

const baseRequests = [
  { title: "Logo package", detail: "SVG, PNG, favicon zip", status: "Missing" },
  { title: "Brand colors", detail: "Forest #214D3F, Cream #F6EFE2", status: "Submitted" },
  { title: "Homepage copy", detail: "Headline, sections, CTA", status: "Missing" },
  { title: "Launch approval", detail: "Final go-ahead before build", status: "Needs review" }
];

const clientActions: Array<{ title: string; value: string; icon: LucideIcon }> = [
  { title: "Upload logo files", value: "greenline-logo-pack.zip", icon: UploadCloud },
  { title: "Add brand colors", value: "Primary #214D3F", icon: Palette },
  { title: "Paste social links", value: "instagram.com/greenline", icon: Link2 }
];

const pricing = [
  ["Free", "$0", "1 active packet · copy links"],
  ["Starter", "$9", "5 active packets · client emails"],
  ["Pro", "$19", "25 active packets · client emails"],
  ["Studio", "$39", "Unlimited packets · branding · client emails"]
];

export default function LandingPage() {
  const [copySubmitted, setCopySubmitted] = useState(false);
  const requests = useMemo(
    () =>
      baseRequests.map((request) =>
        request.title === "Homepage copy" && copySubmitted
          ? { ...request, detail: "Fresh coffee, daily bakes, neighborhood table.", status: "Submitted" }
          : request
      ),
    [copySubmitted]
  );
  const missing = requests.filter((request) => request.status === "Missing").length;
  const submitted = requests.filter((request) => request.status === "Submitted").length;

  return (
    <main className="bg-paper text-ink">
      <header className="border-b border-line bg-[#fbfaf6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span>
              <span className="block text-sm font-semibold">ProjectPacket</span>
              <span className="hidden text-xs text-ink/50 sm:block">Client asset packets</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost">
              Login
            </ButtonLink>
            <ButtonLink href="/signup">Start free</ButtonLink>
          </nav>
        </div>
      </header>

      <section className="border-b border-line bg-[#fbfaf6]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-ink/50">ProjectPacket</p>
            <h1 className="mt-3 max-w-2xl text-[2.55rem] font-semibold leading-[1.02] text-ink sm:text-5xl">
              Stop waiting on client assets.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink/70">
              Send one clean upload link for logos, copy, photos, links, colors, files, and approvals. See what is missing before another email thread slows the project down.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" className="min-h-11 px-4">
                Start free
                <ArrowRight size={16} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="#pricing" className="min-h-11 px-4 bg-white" variant="secondary">
                See pricing
              </ButtonLink>
            </div>
          </div>

          <div className="mt-10 overflow-hidden rounded-md border border-[#d8d1c5] bg-white shadow-[0_24px_70px_rgba(31,36,33,0.14)]">
            <div className="flex flex-col gap-3 border-b border-line bg-[#202522] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-white/50">Northstar Studio</p>
                <h2 className="mt-1 text-base font-semibold">Greenline Coffee Website Launch</h2>
              </div>
              <p className="text-xs text-white/60">{missing} missing · {submitted} submitted</p>
            </div>

            <div className="grid divide-y divide-line lg:grid-cols-[1.05fr_0.95fr_0.9fr] lg:divide-x lg:divide-y-0">
              <div className="bg-[#fffcf6]">
                <div className="border-b border-line px-4 py-3">
                  <p className="text-xs font-medium text-ink/50">Requested from client</p>
                </div>
                <div className="divide-y divide-line">
                  {requests.map((request) => (
                    <div key={request.title} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{request.title}</p>
                        <p className="mt-1 truncate text-sm text-ink/50">{request.detail}</p>
                      </div>
                      <span className={requestStateClass(request.status)}>{request.status}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-line bg-[#f8f5ee] px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 truncate font-mono text-xs text-ink/50">
                      /p/packet_4f8c9a12d7e24b58b6c3910a85f3d2e7
                    </p>
                    <button
                      type="button"
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white transition hover:bg-teal"
                      onClick={() => setCopySubmitted((current) => !current)}
                    >
                      <ClipboardCopy size={15} aria-hidden="true" />
                      {copySubmitted ? "Reset" : "Submit copy"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4">
                <p className="text-xs font-medium text-ink/50">Client view</p>
                <h2 className="mt-2 text-lg font-semibold">Upload what Maya needs</h2>
                <p className="mt-1 text-sm leading-6 text-ink/60">A short page with exactly the files, links, notes, and approvals requested.</p>
                <div className="mt-4 grid gap-3">
                  {clientActions.map(({ title, value, icon: Icon }) => (
                    <div key={title} className="rounded-md border border-line bg-[#fbfaf6] p-3">
                      <div className="flex items-center gap-2">
                        <Icon size={15} className="text-ink/50" aria-hidden="true" />
                        <p className="text-sm font-semibold">{title}</p>
                      </div>
                      <p className="mt-2 truncate rounded-md bg-white px-3 py-2 text-xs text-ink/60">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#f7f6f2] p-4">
                <p className="text-xs font-medium text-ink/50">Freelancer review</p>
                <div className="mt-3 grid gap-3">
                  <ReviewLine icon={FileText} title="Brand colors" detail="3 swatches detected" accent="teal" />
                  <ReviewLine icon={MessageSquare} title="Homepage copy" detail={copySubmitted ? "Ready to review" : "Still missing"} accent={copySubmitted ? "blue" : "sun"} />
                  <ReviewLine icon={Send} title="Reminder" detail="Drafted for missing items" accent="clay" />
                </div>
                <button className="mt-4 flex min-h-10 w-full items-center justify-center rounded-md bg-teal px-3 text-sm font-medium text-white">
                  Review packet
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-sm font-medium text-ink/50">The switch</p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight">
              Replace scattered client requests with one visible handoff.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Before", "Logo is in an old email", "Copy lives in three docs", "Approval buried in a thread", "Photos sent by text"],
              ["After", "One upload link", "Missing items visible", "Files and notes together", "Approvals tracked"]
            ].map(([title, ...items]) => (
              <div key={title} className="rounded-md border border-line bg-white">
                <div className="border-b border-line px-4 py-3">
                  <p className="text-sm font-semibold text-ink/70">{title}</p>
                </div>
                <div className="divide-y divide-line">
                  {items.map((item) => (
                    <div key={item} className="flex items-center gap-3 px-4 py-3 text-sm text-ink/70">
                      {title === "After" ? (
                        <CheckCircle2 size={15} className="text-ink/40" aria-hidden="true" />
                      ) : (
                        <MessageSquare size={15} className="text-ink/35" aria-hidden="true" />
                      )}
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-[#202522] text-white">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 py-10 sm:px-6 lg:grid-cols-3">
          {[
            ["Create the packet", "Pick a website, brand, social, or video checklist and edit the exact items you need."],
            ["Send one link", "Clients upload files, paste links, add copy, and approve items from a short packet page."],
            ["Review and finish", "Approve, request changes, waive items, send reminders, then mark the packet complete."]
          ].map(([title, text], index) => (
            <div key={title} className={`py-4 lg:px-6 ${index ? "border-t border-white/10 lg:border-l lg:border-t-0" : ""}`}>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-medium text-ink/50">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold">Plans that fit solo studios.</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink/60">
              Start with one active packet, then upgrade when client handoffs become part of your weekly workflow.
            </p>
          </div>
          <div className="rounded-md border border-line bg-white">
            {pricing.map(([plan, price, detail]) => (
              <div key={plan} className="grid gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_110px_1.2fr] sm:items-center">
                <p className="font-semibold">{plan}</p>
                <p className="text-2xl font-semibold">
                  {price}<span className="text-sm font-medium text-ink/50">/mo</span>
                </p>
                <p className="text-sm text-ink/60">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-[#fbfaf6]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-sm font-medium text-ink/50">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold">Built for creative handoffs.</h2>
          </div>
          <div className="grid gap-3">
            <FaqItem
              question="Do clients need an account?"
              answer="No. They open the private packet link and submit the files, notes, links, and approvals you requested."
            />
            <FaqItem
              question="Is this for financial, legal, or medical documents?"
              answer={SENSITIVE_UPLOAD_WARNING}
            />
            <FaqItem
              question="Where are files stored?"
              answer="Files are stored in a private Supabase Storage bucket and opened from the freelancer dashboard with signed download links."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-ink/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>ProjectPacket is for creative project asset collection.</p>
          <div className="flex flex-wrap gap-4">
            <Link className="font-semibold hover:text-ink" href="/privacy">Privacy</Link>
            <Link className="font-semibold hover:text-ink" href="/terms">Terms</Link>
            <a className="font-semibold hover:text-ink" href={`mailto:${SUPPORT_EMAIL}`}>Support</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ReviewLine({
  icon: Icon,
  title,
  detail,
  accent
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  accent: "teal" | "blue" | "sun" | "clay";
}) {
  const accentClass = {
    teal: "bg-teal/[0.08] text-ink/60",
    blue: "bg-blue/[0.08] text-ink/60",
    sun: "bg-sun/[0.12] text-ink/60",
    clay: "bg-clay/[0.08] text-ink/60"
  }[accent];

  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-white p-3">
      <span className={`grid h-8 w-8 place-items-center rounded-md ${accentClass}`}>
        <Icon size={15} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-ink/50">{detail}</span>
      </span>
    </div>
  );
}

function requestStateClass(status: string) {
  const base = "inline-flex w-fit items-center gap-1.5 text-xs font-medium before:block before:h-1.5 before:w-1.5 before:rounded-full";

  if (status === "Needs review") {
    return `${base} text-ink/60 before:bg-blue/60`;
  }

  if (status === "Submitted") {
    return `${base} text-ink/60 before:bg-teal/70`;
  }

  return `${base} text-ink/50 before:bg-sun/70`;
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <h3 className="text-sm font-semibold">{question}</h3>
      <p className="mt-2 text-sm leading-6 text-ink/60">{answer}</p>
    </div>
  );
}
