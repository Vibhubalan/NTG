import type { FinalStandingView } from "@core/contracts/tournament-bracket";

export type MvpData = {
  displayName: string;
  riotId?: string | null;
  rankTier?: string | null;
};

type Props = {
  standings: FinalStandingView[];
  mvp?: string | MvpData | null;
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

export default function TournamentFinalResults({ standings, mvp }: Props) {
  if (standings.length === 0 && !mvp) return null;

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--color-brand)]" />
        <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-white">
          Final Results
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--color-brand)] to-transparent opacity-30" />
      </div>

      {standings.length > 0 ? (
        <div
          className={`grid gap-4 ${
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
                className={`overflow-hidden rounded-[1.25rem] border bg-[#0A0A0A]/80 p-5 backdrop-blur-sm ${style.border}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-[10px] font-black tracking-[0.2em] ring-1 ring-inset ${style.badge}`}
                  >
                    {style.badgeText}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                    {style.label}
                  </span>
                </div>
                <p className="mt-4 font-display text-xl font-black italic tracking-tight text-white sm:text-2xl">
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
        <div className="group relative mt-10 overflow-hidden rounded-[2rem] border border-[var(--color-iris)]/30 bg-gradient-to-br from-[#0F0F0F] to-[#050505] shadow-[0_0_50px_rgba(124,58,237,0.15)] transition-all hover:border-[var(--color-iris)]/60 hover:shadow-[0_0_80px_rgba(124,58,237,0.25)]">
          {/* Animated Backgrounds */}
          <div className="absolute -inset-24 z-0 animate-pulse bg-gradient-to-tr from-[var(--color-iris)]/20 via-transparent to-[var(--color-iris)]/5 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative z-10 px-6 py-5 sm:px-8 sm:py-6 flex flex-col items-center text-center">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-iris)]/30 bg-[var(--color-iris)]/10 px-4 py-1.5 shadow-[0_0_15px_rgba(124,58,237,0.3)] backdrop-blur-md mb-4">
              <span className="h-2 w-2 rounded-full bg-[var(--color-iris)] shadow-[0_0_8px_rgba(124,58,237,1)] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-iris)]">
                Tournament MVP
              </span>
            </div>

            {/* Rank Logo and User Info */}
            <div className="relative mb-3">
              {/* If we have a rank, show it big */}
              {typeof mvp === "object" && mvp?.rankTier ? (
                <div className="relative flex h-16 w-16 items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_30px_rgba(124,58,237,0.6)]">
                  {/* Outer glow */}
                  <div className="absolute inset-0 rounded-full bg-[var(--color-iris)]/20 blur-xl group-hover:bg-[var(--color-iris)]/40 transition-colors duration-500" />
                  <img
                    src={`/valorant/ranks/${mvp.rankTier.replace(" ", "_")}_Rank.png`}
                    alt={mvp.rankTier}
                    className="relative z-10 h-full w-full object-contain drop-shadow-2xl"
                  />
                </div>
              ) : (
                /* Fallback Icon if no rank */
                <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[var(--color-iris)]/20 to-[var(--color-iris)]/5 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.3)] backdrop-blur-xl transition-transform duration-500 group-hover:scale-110 group-hover:shadow-[inset_0_0_0_1px_rgba(124,58,237,0.6)] group-hover:drop-shadow-[0_0_30px_rgba(124,58,237,0.4)]">
                  <svg className="h-8 w-8 text-[var(--color-iris)] drop-shadow-[0_0_15px_rgba(124,58,237,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v8l9-11h-7z" />
                  </svg>
                  <div className="absolute inset-0 rounded-[1.5rem] shadow-[0_0_30px_rgba(124,58,237,0.2)]" />
                </div>
              )}
            </div>

            {/* Name */}
            <h3 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-lg group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-[var(--color-iris)] group-hover:bg-clip-text group-hover:text-transparent transition-all duration-500">
              {typeof mvp === "string" ? mvp : mvp?.displayName}
            </h3>

            {/* Additional Details */}
            {typeof mvp === "object" && mvp && (mvp.riotId || mvp.rankTier) && (
              <div className="mt-2 flex flex-col items-center gap-1.5">
                {mvp.rankTier && (
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-iris)]/80">
                    {mvp.rankTier}
                  </span>
                )}
                {mvp.riotId && (
                  <span className="inline-block rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/60 tracking-wider ring-1 ring-white/10 backdrop-blur-sm">
                    {mvp.riotId}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Faint Watermark Logo */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 opacity-5 transition-opacity duration-700 group-hover:opacity-10">
            <svg className="h-96 w-96 text-[var(--color-iris)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v8l9-11h-7z" />
            </svg>
          </div>
        </div>
      ) : null}
    </section>
  );
}
