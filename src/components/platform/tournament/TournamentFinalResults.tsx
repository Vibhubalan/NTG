import type { FinalStandingView } from "@core/contracts/tournament-bracket";

type Props = {
  standings: FinalStandingView[];
  mvp?: string | null;
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
        <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-[var(--color-iris)]/25 bg-gradient-to-r from-[var(--color-iris)]/10 to-transparent p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-iris)]/30 bg-[var(--color-iris)]/10 text-[var(--color-iris)]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v8l9-11h-7z" />
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--color-iris)]/80">
                Tournament MVP
              </p>
              <p className="mt-1 font-display text-2xl font-black tracking-wide text-white">{mvp}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
