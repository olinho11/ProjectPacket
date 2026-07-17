export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-bold text-white ${className}`}
      aria-hidden="true"
    >
      PP
    </span>
  );
}
