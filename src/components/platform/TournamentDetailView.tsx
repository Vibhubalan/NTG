import BrandIcon from "@/components/ui/BrandIcon";
import StatusBadge from "@/components/platform/ui/StatusBadge";
import TournamentBracket from "@/components/platform/tournament/TournamentBracket";
import TournamentBracketEmpty from "@/components/platform/tournament/TournamentBracketEmpty";
import TournamentFinalResults from "@/components/platform/tournament/TournamentFinalResults";
import TournamentPlayersRegistered from "@/components/platform/tournament/TournamentPlayersRegistered";
import TournamentTeamsList from "@/components/platform/tournament/TournamentTeamsList";
import { gameMetaFor } from "@/lib/tournament-display";
import TournamentRegisterForm from "./TournamentRegisterForm";
import type { RegistrationPreview } from "./TournamentRegisterForm";
import type { TournamentDetail } from "@core/contracts";
import type { TournamentBracketView, FinalStandingView } from "@core/contracts/tournament-bracket";

type Props = {
  tournament: TournamentDetail;
  bracket: TournamentBracketView | null;
  isLoggedIn: boolean;
  registrationPreview?: RegistrationPreview | null;
};

export default function TournamentDetailView({
  tournament,
  bracket,
  isLoggedIn,
  registrationPreview,
}: Props) {
  const meta = gameMetaFor(tournament.game);
  const dateStr = tournament.startsAt
    ? new Date(tournament.startsAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date TBA";

  const isCompleted = tournament.status === "COMPLETED";
  const mvpPlacement = tournament.placements.find((p) => p.role === "MVP");
  const adminMvp =
    mvpPlacement?.teamLabel?.trim() ? mvpPlacement.displayName : null;
  const mvp = bracket?.mvp ?? adminMvp ?? null;

  const fallbackStandings: FinalStandingView[] = [];

  const standings =
    bracket?.finalStandings && bracket.finalStandings.length > 0
      ? bracket.finalStandings.filter((s) => s.rank === 1 || s.rank === 2)
      : fallbackStandings;

  const prizeSplit =
    tournament.prizeSplit && tournament.prizeSplit.length > 0
      ? tournament.prizeSplit
      : tournament.prizePool && !isNaN(Number(tournament.prizePool))
        ? [
            { place: 1, label: "Winner", amount: Math.round(Number(tournament.prizePool) * 0.6) },
            { place: 2, label: "Runner Up", amount: Math.round(Number(tournament.prizePool) * 0.3) },
            { place: 3, label: "3rd Place", amount: Math.round(Number(tournament.prizePool) * 0.1) },
          ]
        : [];

  const showFinalResults = standings.length > 0 || Boolean(mvp);
  const showBracket = Boolean(tournament.bracketUrl);
  const showTeams =
    tournament.teams.length > 0 ||
    tournament.teamDetails.length > 0 ||
    tournament.registrationOpen;

  const splitColors = ["text-amber-500/90", "text-slate-300/90", "text-amber-700/90"];
  const splitBadgeColors = ["bg-amber-500/20 text-amber-500", "bg-slate-300/20 text-slate-300", "bg-amber-700/20 text-amber-700"];

  return (
    <article className="pb-24">
      <div className="relative mb-12 flex min-h-[24rem] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/[0.08] p-8 shadow-2xl sm:min-h-[30rem] sm:p-12">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-80"
          style={{
            backgroundImage: `url('${tournament.posterUrl ?? "/images/tournament_poster.png"}')`,
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-4">
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#050505]/90 ring-1 ring-white/10 backdrop-blur-md"
              style={{ color: meta.hex, boxShadow: `0 0 50px -10px ${meta.hex}80` }}
            >
              <BrandIcon path={meta.iconPath} title={tournament.name} className="h-8 w-8 drop-shadow-md" />
            </span>
            <div className="flex flex-col items-start">
              <StatusBadge status={tournament.status} />
              <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                {tournament.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white/60">
                <span>{tournament.gameLabel ?? meta.label}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>{dateStr}</span>
                {tournament.seasonLabel ? (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span style={{ color: meta.hex }}>{tournament.seasonLabel}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-16">
          {showFinalResults ? (
            <TournamentFinalResults
              standings={standings}
              mvp={mvp}
            />
          ) : null}


          {showTeams ? (
            <TournamentTeamsList
              teams={tournament.teams}
              teamDetails={tournament.teamDetails}
              accentHex={meta.hex}
              game={tournament.game}
            />
          ) : null}
        </div>

        <aside className="space-y-8">
          <div className="space-y-8">
            <TournamentPlayersRegistered count={tournament.registrationCount} />

            {(tournament.prizePool || tournament.prizeNotes) && (
              <div className="rounded-[1.5rem] border border-white/[0.08] bg-[#0A0A0A]/80 p-8 shadow-2xl backdrop-blur-xl">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">Prizepool</p>
                {tournament.prizePool ? (
                  <p className="mt-2 font-display text-4xl font-black tracking-tight text-white drop-shadow-md">
                    ₹{Number(tournament.prizePool).toLocaleString("en-IN")}
                  </p>
                ) : null}
                {tournament.prizeNotes ? (
                  <p className="mt-3 text-sm font-medium leading-relaxed text-white/50">
                    {tournament.prizeNotes}
                  </p>
                ) : null}

                {prizeSplit.length > 0 ? (
                  <div className="mt-6 border-t border-white/[0.06] pt-6">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                      Prize Split
                    </p>
                    <div className="space-y-3">
                      {prizeSplit.map((row, i) => (
                        <div key={row.place} className="flex items-center justify-between">
                          <span className={`flex items-center gap-2 text-sm font-medium ${splitColors[i] ?? "text-white/70"}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${splitBadgeColors[i] ?? "bg-white/10 text-white/70"}`}>
                              {row.place}
                            </span>
                            {row.label}
                          </span>
                          <span className="font-display font-bold text-white/90">
                            ₹{row.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {tournament.registrationOpen ? (
              <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02] p-8 shadow-xl backdrop-blur-md">
                <TournamentRegisterForm
                  slug={tournament.slug}
                  game={tournament.game}
                  isLoggedIn={isLoggedIn}
                  alreadyRegistered={tournament.userRegistered}
                  registrationOpen={tournament.registrationOpen}
                  rulebookUrl={tournament.rulebookUrl}
                  preview={registrationPreview ?? null}
                />
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {showBracket && tournament.bracketUrl ? (
        <section className="mt-16">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-rose-500" />
            <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-white">
              Bracket
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-rose-500 to-transparent opacity-30" />
          </div>
          {bracket ? (
            <TournamentBracket bracket={bracket} accentHex={meta.hex} />
          ) : (
            <TournamentBracketEmpty url={tournament.bracketUrl} />
          )}
        </section>
      ) : null}
    </article>
  );
}
