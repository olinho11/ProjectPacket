import { CheckCheck, FileText, Link2, MessageSquareText, Palette, Upload } from "lucide-react";
import type { ChecklistItemType } from "@/src/types";

const iconByType = {
  file: Upload,
  text: MessageSquareText,
  link: Link2,
  approval: CheckCheck
};

const toneByType = {
  file: "bg-blue/[0.09] text-blue",
  text: "bg-violet/[0.09] text-violet",
  link: "bg-teal/[0.09] text-teal",
  approval: "bg-clay/[0.09] text-clay"
};

export function AssetIcon({ type, isColor = false, className = "" }: { type: ChecklistItemType; isColor?: boolean; className?: string }) {
  const Icon = isColor ? Palette : iconByType[type] ?? FileText;
  const tone = isColor ? "bg-sun/[0.13] text-[#9a5f00]" : toneByType[type];

  return (
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone} ${className}`} aria-hidden="true">
      <Icon size={17} strokeWidth={1.8} />
    </span>
  );
}
