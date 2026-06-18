import type { TournamentPlacementView } from "@core/contracts";

type Props = {
  placements: TournamentPlacementView[];
};

export default function TournamentResultsHonors({ placements }: Props) {
  const champ = placements.find((p) => p.role === "CHAMPION");
  const mvp = placements.find((p) => p.role === "MVP");
  const runnerUp = placements.find((p) => p.role === "RUNNER_UP");

  if (!champ && !mvp && !runnerUp) return null;

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--color-brand)]" />
        <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-white">
          Results & Honors
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--color-brand)] to-transparent opacity-30" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {champ ? (
          <div className="group relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-amber-500/10 to-transparent p-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex h-full flex-col items-center justify-center rounded-[1.4rem] border border-amber-500/20 bg-[#0A0A0A]/90 px-6 py-10 text-center backdrop-blur-xl">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/80">Champion</p>
              <p className="mt-2 font-display text-3xl font-black tracking-wide text-white drop-shadow-md">
                {champ.displayName}
              </p>
            </div>
          </div>
        ) : null}

        {mvp ? (
          <div className="group relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[var(--color-iris)]/10 to-transparent p-1">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-iris)]/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex h-full flex-col items-center justify-center rounded-[1.4rem] border border-[var(--color-iris)]/20 bg-[#0A0A0A]/90 px-6 py-10 text-center backdrop-blur-xl">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-iris)]/30 bg-[var(--color-iris)]/10 text-[var(--color-iris)] shadow-[0_0_30px_rgba(124,58,237,0.2)]">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v8l9-11h-7z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-iris)]/80">
                Tournament MVP
              </p>
              <p className="mt-2 font-display text-3xl font-black tracking-wide text-white drop-shadow-md">
                {mvp.displayName}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {runnerUp ? (
        <div className="group relative mt-4 overflow-hidden rounded-[1.25rem] bg-gradient-to-r from-slate-400/10 via-transparent to-transparent p-1">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-400/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative flex items-center gap-5 rounded-xl border border-slate-400/20 bg-[#0A0A0A]/90 px-6 py-5 backdrop-blur-xl">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-400/30 bg-slate-400/10 text-slate-300 shadow-[0_0_20px_rgba(148,163,184,0.15)]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400/80">Runner Up</p>
              <p className="mt-1 font-display text-2xl font-black tracking-wide text-white drop-shadow-sm">
                {runnerUp.displayName}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
