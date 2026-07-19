"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, FolderKanban, LayoutDashboard, LogOut, Plus, Settings, SquareStack } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button, ButtonLink } from "@/components/ui";
import { brandForeground, normalizeBrandColor } from "@/src/colors";
import { useProjectPacket } from "@/src/store";

const nav = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/projects", label: "Packets", icon: FolderKanban },
  { href: "/templates", label: "Templates", icon: SquareStack },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children, brandColor }: { children: ReactNode; brandColor?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, signOut } = useProjectPacket();
  const activeBrandColor = normalizeBrandColor(brandColor ?? currentUser?.brandColor);

  return (
    <main
      className="min-h-screen w-full max-w-full overflow-x-clip bg-paper text-ink"
      style={{
        "--brand-color": activeBrandColor,
        "--brand-foreground": brandForeground(activeBrandColor)
      } as CSSProperties}
    >
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-line bg-[#fbfaf6] px-3 py-4 md:block">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-2 py-2">
          <BrandMark />
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold text-ink/50">ProjectPacket</span>
            <span className="block truncate text-sm font-semibold text-ink">{currentUser?.businessName ?? "Workspace"}</span>
          </span>
        </Link>

        <Link
          href="/projects/new"
          className="focus-ring mt-5 inline-flex min-h-10 w-full items-center justify-start gap-2 rounded-md bg-[var(--brand-color)] px-3.5 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:brightness-95"
        >
          <Plus size={15} aria-hidden="true" />
          New packet
        </Link>

        <nav className="mt-5 grid gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                  active ? "bg-ink text-white" : "text-ink/60 hover:bg-black/[0.045] hover:text-ink"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-3 right-3">
          <div className="mb-3 rounded-md border border-line bg-white p-3">
            <p className="text-xs font-medium text-ink/50">Workspace note</p>
            <p className="mt-2 text-sm leading-5 text-ink/60">Keep the next missing asset visible before the project stalls.</p>
          </div>
          <Button
            className="w-full justify-start"
            variant="secondary"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
          >
            <LogOut size={15} aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-line bg-[#fbfaf6]/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold">
            <BrandMark className="h-8 w-8" />
            <span className="truncate">ProjectPacket</span>
          </Link>
          <ButtonLink href="/projects/new" className="min-h-9 px-3">
            <Plus size={15} aria-hidden="true" />
            New
          </ButtonLink>
        </div>
        <nav className="mt-3 grid grid-cols-5 gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-10 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold transition ${
                  active ? "bg-ink text-white" : "text-ink/50 hover:bg-black/[0.04] hover:text-ink"
                }`}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="min-w-0 max-w-full overflow-x-clip md:pl-60">{children}</div>
    </main>
  );
}
