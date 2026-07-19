import type { CSSProperties } from "react";

type BrandMarkProps = {
  className?: string;
  tone?: "default" | "inverse";
  title?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  style?: CSSProperties;
};

export function BrandMark({
  className = "",
  tone = "default",
  title,
  backgroundColor,
  foregroundColor,
  style
}: BrandMarkProps) {
  const background = backgroundColor ?? (tone === "inverse" ? "#fbfaf6" : "#1f2421");
  const foreground = foregroundColor ?? (tone === "inverse" ? "#1f2421" : "#fffcf6");
  const accent = backgroundColor ?? "#0f766e";

  return (
    <svg
      viewBox="0 0 36 36"
      className={`h-9 w-9 shrink-0 ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      <rect x="1" y="1" width="34" height="34" rx="8" fill={background} />
      <rect x="10" y="7" width="16" height="18" rx="2.5" fill={foreground} />
      <path d="M13 12.25h6.25" stroke={background} strokeWidth="1.5" strokeLinecap="round" opacity="0.48" />
      <path d="M13 15.5h4.25" stroke={background} strokeWidth="1.5" strokeLinecap="round" opacity="0.32" />
      <circle cx="22.25" cy="14.05" r="1.65" fill={accent} />
      <path
        d="M7 18.25h6.4l2.04 2.55c.42.52 1.05.82 1.72.82h1.68c.67 0 1.3-.3 1.72-.82l2.04-2.55H29v7.25A3.5 3.5 0 0 1 25.5 29h-15A3.5 3.5 0 0 1 7 25.5v-7.25Z"
        fill={backgroundColor ? foreground : tone === "inverse" ? "#9fd5c3" : "#b9dfd2"}
        fillOpacity={backgroundColor ? 0.88 : 1}
      />
    </svg>
  );
}
