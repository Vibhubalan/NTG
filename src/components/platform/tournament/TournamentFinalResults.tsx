import type { FinalStandingView } from "@core/contracts/tournament-bracket";

export type MvpData = {
  displayName: string;
  userId?: string | null;
  riotId?: string | null;
  rankTier?: string | null;
  valorantRankTierId?: number | null;
  riotPlayerCard?: string | null;
  riotPlayerCardWide?: string | null;
};

type Props = {
  standings: FinalStandingView[];
  mvp?: string | MvpData | null;
  /** When false, parent owns the "Final Results" heading. */
  showHeading?: boolean;
};

const rankStyles: Record<
  number,
  { border: string; badge: string; badgeText: string; label: string }
> = {
  1: {
    border: "border-amber-400/50",
    badge: "bg-amber-400/15 text-amber-300 ring-amber-400/40",
    badgeText: "1ST",
    label: "Champion",
  },
  2: {
    border: "border-slate-300/40",
    badge: "bg-slate-300/10 text-slate-200 ring-slate-300/35",
    badgeText: "2ND",
    label: "Runner Up",
  },
  3: {
    border: "border-amber-700/45",
    badge: "bg-amber-700/15 text-amber-600 ring-amber-700/35",
    badgeText: "3RD",
    label: "3rd Place",
  },
};

export default function TournamentFinalResults({
  standings,
  mvp,
  showHeading = true,
}: Props) {
  if (standings.length === 0 && !mvp) return null;

  return (
    <section>
      {showHeading ? (
        <div className="mb-6 flex min-w-0 items-center gap-3">
          <div className="hidden h-px w-8 shrink-0 bg-gradient-to-r from-transparent to-[var(--color-brand)] sm:block" />
          <h2 className="min-w-0 font-display text-xl font-bold tracking-widest text-white uppercase sm:text-2xl">
            Final Results
          </h2>
          <div className="h-px min-w-0 flex-1 bg-gradient-to-r from-[var(--color-brand)] to-transparent opacity-30" />
        </div>
      ) : null}

      {standings.length > 0 ? (
        <div
          className={`grid min-w-0 gap-4 ${
            standings.length === 4
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              : standings.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : standings.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-1 sm:grid-cols-3"
          }`}
        >
          {standings.map((standing) => {
            const style = rankStyles[standing.rank] ?? rankStyles[3];
            return (
              <div
                key={`rank-${standing.rank}-${standing.name}`}
                className={`min-w-0 overflow-hidden rounded-[1.25rem] border bg-[#0A0A0A]/80 p-4 backdrop-blur-sm sm:p-5 ${style.border}`}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                  <span
                    className={`inline-flex shrink-0 rounded-md px-2 py-1 text-[10px] font-black tracking-[0.16em] ring-1 ring-inset sm:tracking-[0.2em] ${style.badge}`}
                  >
                    {style.badgeText}
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.16em] text-white/40 uppercase sm:tracking-[0.2em]">
                    {style.label}
                  </span>
                </div>
                <p className="mt-4 break-words font-display text-xl font-black italic tracking-tight text-white sm:text-2xl">
                  {standing.name}
                </p>
                <p className="mt-2 font-display text-sm font-semibold tabular-nums text-white/45">
                  {standing.record}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {mvp ? (
        <div
          className={`relative isolate overflow-hidden rounded-[2rem] border border-[var(--color-iris)]/35 bg-[#07080b] shadow-[0_30px_80px_-40px_rgba(124,58,237,0.55)] ${
            standings.length > 0 ? "mt-10" : ""
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.28),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(56,189,248,0.08),transparent_45%)]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a78bfa' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />
          <div className="pointer-events-none absolute -top-1 left-1/2 h-px w-[min(80%,36rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--color-iris)]/80 to-transparent" />

          <div className="relative z-10 px-5 py-8 sm:px-10 sm:py-10">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex items-center gap-3">
                <svg className="h-14 w-8 text-[var(--color-iris)]/70" viewBox="0 0 48 80" fill="none" aria-hidden>
                  <path
                    d="M38 8c-10 6-16 18-16 32s6 26 16 32c-14-4-24-18-24-32S24 12 38 8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.55"
                  />
                  <path d="M22 20c-6 4-10 10-10 20" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
                  <path d="M24 36c-7 3-11 9-11 16" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
                </svg>

                {typeof mvp === "object" && mvp.rankTier ? (
                  <div className="flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
                    <img
                      src={`/valorant/ranks/${mvp.rankTier.replace(" ", "_")}_Rank.png`}
                      alt={mvp.rankTier}
                      className="h-full w-full object-contain drop-shadow-[0_8px_24px_rgba(124,58,237,0.45)]"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[var(--color-iris)]/50 bg-gradient-to-b from-[var(--color-iris)]/25 to-[var(--color-iris)]/5 text-[var(--color-iris)] shadow-[0_0_40px_rgba(124,58,237,0.3)] sm:h-24 sm:w-24">
                    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v8l9-11h-7z" />
                    </svg>
                  </div>
                )}

                <svg className="h-14 w-8 -scale-x-100 text-[var(--color-iris)]/70" viewBox="0 0 48 80" fill="none" aria-hidden>
                  <path
                    d="M38 8c-10 6-16 18-16 32s6 26 16 32c-14-4-24-18-24-32S24 12 38 8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.55"
                  />
                  <path d="M22 20c-6 4-10 10-10 20" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
                  <path d="M24 36c-7 3-11 9-11 16" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
                </svg>
              </div>

              <div className="mb-3 inline-flex items-center rounded-md bg-[var(--color-iris)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                Tournament MVP
              </div>

              <h3 className="max-w-full break-words font-display text-[clamp(2rem,5vw,4rem)] font-black uppercase leading-[0.92] tracking-tight text-white">
                {typeof mvp === "string" ? mvp : mvp.displayName}
              </h3>

              {typeof mvp === "object" && mvp && (mvp.rankTier || mvp.riotId) ? (
                <div className="mt-5 flex flex-col items-center gap-2.5">
                  {mvp.rankTier ? (
                    <span className="text-xs font-black uppercase tracking-[0.28em] text-[var(--color-iris)]">
                      {mvp.rankTier}
                    </span>
                  ) : null}
                  {mvp.riotId ? (
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[11px] font-medium tracking-wide text-white/65">
                      {mvp.riotId}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
