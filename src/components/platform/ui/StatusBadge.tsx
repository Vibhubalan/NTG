type Props = {
  status: string;
  variant?: "default" | "live" | "open" | "upcoming" | "hosted";
};

const styles: Record<NonNullable<Props["variant"]>, string> = {
  default: "bg-white/[0.05] text-white/60 ring-white/10",
  live: "bg-red-500/15 text-red-400 ring-red-500/35",
  open: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
  upcoming: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/25",
  hosted: "bg-red-950/20 text-red-400/80 ring-red-900/30",
};

export default function StatusBadge({ status, variant = "default" }: Props) {
  const v =
    variant !== "default"
      ? variant
      : status === "Live" || status === "IN_PROGRESS"
        ? "live"
        : status === "Open" || status === "REGISTRATION_OPEN"
          ? "open"
          : status === "Upcoming" || status === "UPCOMING"
            ? "upcoming"
            : status === "Hosted" || status === "COMPLETED"
              ? "hosted"
              : "default";

  const label =
    status === "REGISTRATION_OPEN" || status === "Open"
      ? "Registration Open"
      : status === "IN_PROGRESS" || status === "Live"
        ? "Live"
        : status === "COMPLETED" || status === "Hosted"
          ? "Completed"
          : status === "UPCOMING" || status === "Upcoming"
            ? "Upcoming"
            : status === "DRAFT" || status === "Soon"
              ? "Draft"
              : status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ring-1 ring-inset ${styles[v]}`}
    >
      {(v === "live" || v === "open") && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}
