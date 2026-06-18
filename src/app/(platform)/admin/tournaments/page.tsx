import Link from "next/link";
import CreateTournamentForm from "@/components/admin/CreateTournamentForm";
import { listTournamentsAdmin } from "@tournaments-leagues/index";
import { serverEnv } from "@core/config/env.server";

export const metadata = { title: "Admin Cups" };

function getStatusBadge(status: string) {
  switch (status) {
    case "REGISTRATION_OPEN":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Registration Open
        </span>
      );
    case "UPCOMING":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-300">
          Upcoming
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
          Live
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-900/30 bg-red-950/20 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-red-400/80">
          Completed
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-rose-400">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/50">
          Draft
        </span>
      );
  }
}

export default async function AdminTournamentsPage() {
  const tournaments = serverEnv.databaseUrl ? await listTournamentsAdmin() : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
          Tournament Cups
        </h1>
        <p className="mt-1 text-sm text-white/40">
          Create, edit, configure standings, and manage participating teams for all games.
        </p>
      </div>

      {/* Creation form (collapsible by default now) */}
      <div>
        <CreateTournamentForm />
      </div>

      {/* Tournaments List */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/45 px-1">All Tournaments ({tournaments.length})</h2>
        <ul className="grid gap-3">
          {tournaments.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/admin/tournaments/${t.slug}`}
                className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#0c1424]/30 px-5 py-4.5 transition-all duration-250 hover:border-amber-500/20 hover:bg-[#121c32]/40"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white group-hover:text-amber-400 transition-colors text-base">{t.name}</span>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/50 border border-white/[0.05]">
                      {t.game.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 flex items-center gap-2">
                    <span className="flex items-center gap-1 font-medium text-white/55">
                      <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      {t._count.tournamentTeams} teams
                    </span>
                    <span>·</span>
                    <span>{t._count.registrations} registered users</span>
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-white/[0.04] pt-2 sm:border-t-0 sm:pt-0">
                  {getStatusBadge(t.status)}
                  <span className="text-[11px] font-bold text-amber-500/80 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex items-center gap-0.5">
                    Edit
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

