import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  /** Quiet status next to the title (e.g. "3 open"). */
  meta?: ReactNode;
  align?: "left" | "center";
};

export default function PlatformHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  align = "left",
}: Props) {
  const centered = align === "center";

  return (
    <header className={`mb-12 ${centered ? "flex flex-col items-center text-center" : ""}`}>
      {eyebrow ? (
        <div className={`mb-4 flex items-center gap-3 ${centered ? "justify-center" : ""}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--color-brand)]/90">
            {eyebrow}
          </p>
        </div>
      ) : null}
      <div
        className={`flex flex-wrap items-end gap-x-4 gap-y-2 ${
          centered ? "justify-center" : ""
        }`}
      >
        <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text pb-1 font-display text-4xl font-bold tracking-[-0.01em] text-transparent sm:text-5xl">
          {title}
        </h1>
        {meta ? <div className="pb-2">{meta}</div> : null}
      </div>
      {subtitle ? (
        <p
          className={`mt-5 text-base leading-relaxed text-white/50 sm:text-lg ${
            centered ? "mx-auto max-w-xl" : "max-w-xl"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
