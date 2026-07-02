import Link from "next/link";
import { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function buttonClass(variant: ButtonVariant = "primary") {
  const base =
    "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-teal text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset] hover:bg-[#0a5f58]",
    secondary: "border border-line bg-white text-ink hover:border-ink/25 hover:bg-[#faf9f5]",
    ghost: "text-ink/60 hover:bg-black/[0.045] hover:text-ink",
    danger: "bg-rose text-white hover:bg-[#b91c40]"
  };

  return `${base} ${variants[variant]}`;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button className={`${buttonClass(variant)} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = ""
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <Link className={`${buttonClass(variant)} ${className}`} href={href}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-line bg-white shadow-[0_1px_0_rgba(31,36,33,0.025)] ${className}`}>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-ink/50">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "focus-ring min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink shadow-[0_1px_0_rgba(31,36,33,0.02)] placeholder:text-ink/40 disabled:cursor-not-allowed disabled:bg-[#f1efe8] disabled:text-ink/40";

export const textareaClass =
  "focus-ring min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-ink shadow-[0_1px_0_rgba(31,36,33,0.02)] placeholder:text-ink/40";

export const selectClass =
  "focus-ring min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink shadow-[0_1px_0_rgba(31,36,33,0.02)]";

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-b border-line bg-[#fbfaf6] px-4 py-5 sm:px-6 md:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="mb-2 text-xs font-medium text-ink/50">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[1.65rem] font-semibold leading-tight text-ink sm:text-[1.9rem]">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-line bg-[#fbfaf6] px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink/60">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
