import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { ButtonLink, Card } from "@/components/ui";
import { SENSITIVE_UPLOAD_WARNING } from "@/src/file-safety";
import { SUPPORT_EMAIL } from "@/src/legal";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <LegalHeader />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-ink/50">Privacy</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">ProjectPacket privacy overview</h1>
        <p className="mt-4 text-base leading-7 text-ink/65">
          This page explains what ProjectPacket stores and how that information is used to collect creative project assets.
        </p>

        <div className="mt-8 grid gap-4">
          <PolicySection title="What ProjectPacket stores">
            Account info, project and client info, checklist items, uploaded files, text submissions, links, approvals, and activity logs.
          </PolicySection>
          <PolicySection title="Why it stores this">
            ProjectPacket stores this data so freelancers and small creative studios can collect the project assets they need from clients in one place.
          </PolicySection>
          <PolicySection title="What not to upload">
            {SENSITIVE_UPLOAD_WARNING}
          </PolicySection>
          <PolicySection title="Who can access data">
            The signed-in account owner can view their workspace. Anyone with a private client upload link for a packet can open that packet and submit requested items.
          </PolicySection>
          <PolicySection title="File storage">
            Uploaded files are stored in private Supabase Storage. ProjectPacket uses signed links for opening or downloading files from the freelancer dashboard.
          </PolicySection>
          <PolicySection title="Deletion requests">
            Users can delete submissions and projects in the app. For help with deletion or account questions, contact {SUPPORT_EMAIL}.
          </PolicySection>
        </div>
      </section>
    </main>
  );
}

function LegalHeader() {
  return (
    <header className="border-b border-line bg-[#fbfaf6]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <span className="text-sm font-semibold">ProjectPacket</span>
        </Link>
        <ButtonLink href="/signup">Start free</ButtonLink>
      </div>
    </header>
  );
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/65">{children}</p>
    </Card>
  );
}
