import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink, Card } from "@/components/ui";
import { SENSITIVE_UPLOAD_WARNING } from "@/src/file-safety";
import { SUPPORT_EMAIL } from "@/src/legal";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-[#fbfaf6]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-ink text-xs font-bold text-white">
              PP
            </span>
            <span className="text-sm font-semibold">ProjectPacket</span>
          </Link>
          <ButtonLink href="/signup">Start free</ButtonLink>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-ink/50">Terms</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">ProjectPacket terms</h1>
        <p className="mt-4 text-base leading-7 text-ink/65">
          These plain-English terms explain how ProjectPacket should be used for creative client asset collection.
        </p>

        <div className="mt-8 grid gap-4">
          <TermsSection title="Use ProjectPacket for creative project assets">
            ProjectPacket is built for collecting logos, photos, copy, links, files, feedback, and approvals for creative projects.
          </TermsSection>
          <TermsSection title="Do not upload sensitive regulated information">
            {SENSITIVE_UPLOAD_WARNING}
          </TermsSection>
          <TermsSection title="Users are responsible for requests and uploads">
            Freelancers are responsible for what they ask clients to upload. Clients and users should only upload files they have the right or permission to share.
          </TermsSection>
          <TermsSection title="No illegal, harmful, or infringing content">
            Do not upload illegal files, harmful files, malware, stolen work, or content that violates rights owned by someone else.
          </TermsSection>
          <TermsSection title="Service availability">
            ProjectPacket is a growing product, so features may change as the app improves. Keep your own backup of important project assets.
          </TermsSection>
          <TermsSection title="Contact">
            Questions or deletion requests can be sent to {SUPPORT_EMAIL}.
          </TermsSection>
        </div>
      </section>
    </main>
  );
}

function TermsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/65">{children}</p>
    </Card>
  );
}
