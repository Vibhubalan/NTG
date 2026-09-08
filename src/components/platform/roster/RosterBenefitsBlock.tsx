import Link from "next/link";
import type { RosterTeamView } from "@core/contracts/roster-listings";

type Props = {
  team: RosterTeamView;
};

function formatOpenDate(isoString: string): { dateStr: string; daysAway: number } {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const daysAway = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const dateStr = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  return { dateStr, daysAway };
}

/** Single tryout CTA for the roster page — replaces header chip, schedule banner, and recruiting panel. */
export default function TryoutStatusBlock({ team }: Props) {
  const hasSchedule =
    Boolean(team.tryoutOpensAt) && team.tryoutSchedulePhase !== "unscheduled";
  const closesLabel = team.tryoutClosesAt
    ? formatOpenDate(team.tryoutClosesAt).dateStr
    : null;

  if (team.tryoutIsLive) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-5 py-4">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-300">
            Tryouts are open for NTG {team.gameLabel}!
          </p>
          <p className="mt-0.5 text-xs text-white/45">
            {closesLabel ? `Applications close ${closesLabel}` : "Apply before the window closes."}
          </p>
        </div>
        {team.tryoutListingSlug ? (
          <Link
            href={`/careers/${team.tryoutListingSlug}`}
            className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/25"
          >
            Apply Now →
          </Link>
        ) : null}
      </div>
    );
  }

  if (hasSchedule && team.tryoutOpensAt) {
    const { dateStr, daysAway } = formatOpenDate(team.tryoutOpensAt);

    if (team.tryoutSchedulePhase === "countdown") {
      return (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--color-iris)]/20 bg-gradient-to-r from-[var(--color-iris)]/[0.06] to-transparent px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-iris)]/10 ring-1 ring-inset ring-[var(--color-iris)]/20">
            <svg className="h-5 w-5 text-[var(--color-iris)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-iris)]/70">
              Next tryout window
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">{dateStr}</p>
            <p className="mt-0.5 text-xs text-white/40">
              {daysAway === 1
                ? "Opening tomorrow. Check back soon."
                : `Opening in ${daysAway} days. Check back then.`}
            </p>
          </div>
        </div>
      );
    }

    if (team.tryoutSchedulePhase === "closed") {
      return (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4">
          <p className="text-sm font-medium text-white/60">Tryouts are closed for now.</p>
          <p className="mt-1 text-xs text-white/40">
            Next window opens {dateStr}
            {closesLabel ? ` · closes ${closesLabel}` : null}
          </p>
        </div>
      );
    }
  }

  if (team.status === "RECRUITING") {
    return (
      <div className="rounded-2xl border border-[var(--color-iris)]/15 bg-gradient-to-br from-[var(--color-iris)]/[0.05] to-transparent px-5 py-5 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--color-iris)]/70">
          Recruiting
        </p>
        <p className="mt-2 text-sm font-semibold text-white">
          Building the NTG {team.gameLabel} roster
        </p>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/45">
          Spots are limited. Join NTG as a member, complete your game profile, and apply when
          applications open.
        </p>
        {team.tryoutListingSlug ? (
          <Link
            href={`/careers/${team.tryoutListingSlug}`}
            className="mt-4 inline-flex rounded-full border border-[var(--color-iris)]/25 bg-[var(--color-iris)]/10 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-iris)] transition-colors hover:bg-[var(--color-iris)]/15"
          >
            View tryout details →
          </Link>
        ) : null}
      </div>
    );
  }

  return null;
}
