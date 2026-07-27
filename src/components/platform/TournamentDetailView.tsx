"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import BrandIcon from "@/components/ui/BrandIcon";
import StatusBadge from "@/components/platform/ui/StatusBadge";
import TournamentBracketEmpty from "@/components/platform/tournament/TournamentBracketEmpty";
import TournamentChampionSection from "@/components/platform/tournament/TournamentChampionSection";
import TournamentFinalResults from "@/components/platform/tournament/TournamentFinalResults";
import TournamentScheduleCard from "@/components/platform/tournament/TournamentScheduleCard";
import TournamentTeamsList from "@/components/platform/tournament/TournamentTeamsList";
import { resolveChampion } from "@/lib/tournament-champion";
import { gameMetaFor, formatRegistrationLabel, buildTournamentScheduleCardView } from "@/lib/tournament-display";
import type { RegistrationPreview } from "./TournamentRegisterForm";
import type { TournamentDetail } from "@core/contracts";
import type { ValorantRegistrationProfileCard } from "@core/contracts/registration-profile";
import type { TournamentBracketView, FinalStandingView } from "@core/contracts/tournament-bracket";

const TournamentBracket = dynamic(
  () => import("@/components/platform/tournament/TournamentBracket"),
  {
    loading: () => (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40">
        Loading brackets...
      </div>
    ),
  },
);

const TournamentRegisterForm = dynamic(() => import("./TournamentRegisterForm"));

type Props = {
  tournament: TournamentDetail;
  brackets: { url: string; name?: string | null; isFinal?: boolean; bracket: TournamentBracketView | null }[];
  isLoggedIn: boolean;
  registrationPreview?: RegistrationPreview | null;
  registrationProfileCard?: ValorantRegistrationProfileCard | null;
  auctionHref?: string | null;
  auctionEnded?: boolean;
};

export default function TournamentDetailView({
  tournament,
  brackets,
  isLoggedIn,
  registrationPreview,
  registrationProfileCard,
  auctionHref,
  auctionEnded,
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "brackets">("overview");
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [generatedFallback, setGeneratedFallback] = useState<TournamentBracketView | null>(null);
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
  const adminMvp = mvpPlacement?.user
    ? {
        displayName: mvpPlacement.displayName || mvpPlacement.user.username,
        userId: mvpPlacement.user.id,
        riotId: mvpPlacement.user.riotId,
        rankTier: mvpPlacement.user.rankTier,
        valorantRankTierId: mvpPlacement.user.rankTierId ?? null,
        riotPlayerCard: mvpPlacement.user.riotPlayerCard ?? null,
        riotPlayerCardWide: mvpPlacement.user.riotPlayerCardWide ?? null,
      }
    : mvpPlacement?.teamLabel?.trim()
      ? mvpPlacement.displayName
      : null;
  const hasWinnerStage = brackets.some((b) => b.isFinal !== false);
  const primaryBracket =
    brackets
      .filter((b) => b.isFinal !== false)
      .map((b) => b.bracket)
      .reverse()
      .find((b): b is TournamentBracketView =>
        Boolean(b?.finalStandings?.some((s) => s.rank === 1 && s.name?.trim())),
      ) ?? null;
  const mvp = primaryBracket?.mvp ?? adminMvp ?? null;

  const fallbackStandings: FinalStandingView[] = [];

  const standings =
    primaryBracket?.finalStandings && primaryBracket.finalStandings.length > 0
      ? primaryBracket.finalStandings.filter((s) => s.rank === 1 || s.rank === 2)
      : fallbackStandings;

  const championData = resolveChampion(
    primaryBracket,
    tournament.teamDetails,
    tournament.teams,
    hasWinnerStage ? tournament.placements : [],
  );

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

  const showChampion = Boolean(championData);
  const showFinalResults = !showChampion && (standings.length > 0 || Boolean(mvp));
  const showMvpOnly = showChampion && Boolean(mvp);
  const showResultsBlock = showChampion || showFinalResults || showMvpOnly;
  const showTeams =
    tournament.teams.length > 0 ||
    tournament.teamDetails.length > 0 ||
    tournament.registrationOpen;

  const splitColors = ["text-amber-500/90", "text-slate-300/90", "text-amber-700/90"];
  const splitBadgeColors = ["bg-amber-500/20 text-amber-500", "bg-slate-300/20 text-slate-300", "bg-amber-700/20 text-amber-700"];

  const showRegistrationSection =
    tournament.registrationOpen || tournament.userRegistered;

  const scheduleCard = buildTournamentScheduleCardView({
    registrationFormat: tournament.registrationFormat,
    registrationOpensAt: tournament.registrationOpensAt,
    startsAt: tournament.startsAt,
    endsAt: tournament.endsAt,
    auctionStartsAt: tournament.auctionStartsAt,
  });

  const posterSrc = tournament.posterUrl ?? "/images/tournament_poster.png";

  useEffect(() => {
    if (activeTab !== "brackets" || brackets.length > 0) return;
    if (!tournament.teams.length) return;

    let cancelled = false;
    void import("@/lib/challonge-bracket-gen").then(
      ({ generateBracketFromParticipants, generateRoundRobinBracketFromParticipants }) => {
        if (cancelled) return;
        const isAuction =
          tournament.registrationFormat === "AUCTION" || tournament.slug.includes("auc-cup");
        const participants = tournament.teams.map((t, i) => ({ seed: i + 1, name: t }));
        const fallback = isAuction
          ? generateRoundRobinBracketFromParticipants(participants, tournament.name)
          : generateBracketFromParticipants(participants, tournament.name);
        setGeneratedFallback(fallback);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [activeTab, brackets.length, tournament.teams, tournament.registrationFormat, tournament.slug, tournament.name]);

  return (
    <article className="pb-24">
      <div className="relative mb-12 flex min-h-[24rem] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/[0.08] p-8 shadow-2xl sm:min-h-[30rem] sm:p-12">
        <div className="absolute inset-0 z-0">
          <Image
            src={posterSrc}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover object-center opacity-80"
          />
        </div>
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
                <span>{meta.label}</span>
                {tournament.registrationFormat && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span>{formatRegistrationLabel(tournament.registrationFormat)}</span>
                  </>
                )}
                {dateStr && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span>{dateStr}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-10 flex items-center border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] p-1.5 border border-white/[0.06] w-fit">
          <button
            onClick={() => setActiveTab("overview")}
            className={`rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] transition-all ${
              activeTab === "overview"
                ? "bg-white text-black shadow-lg"
                : "text-white/50 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("brackets")}
            className={`rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
              activeTab === "brackets"
                ? "bg-[#22c55e] text-[#070a12] shadow-lg shadow-emerald-500/20"
                : "text-white/50 hover:text-white"
            }`}
          >
            <span>Brackets</span>
          </button>
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className={`grid gap-12 lg:items-start ${isCompleted ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_24rem]"}`}>
          <div className="order-1 space-y-16 lg:col-start-1 lg:row-start-1">
            {showResultsBlock ? (
              <section className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/70" />
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/25 bg-amber-400/10 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.12)]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
                      </svg>
                    </span>
                    <h2 className="font-display text-2xl font-black uppercase tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-white/70 sm:text-3xl">
                      Final Results
                    </h2>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-300/40 to-transparent" />
                </div>

                {showChampion && championData ? (
                  <div className={isCompleted ? "max-w-7xl" : ""}>
                    <TournamentChampionSection
                      championData={championData}
                      game={tournament.game}
                      accentHex={meta.hex}
                      mvp={mvp}
                      allTeams={tournament.teamDetails}
                    />
                  </div>
                ) : null}

                {showMvpOnly && !showChampion ? (
                  <TournamentFinalResults standings={[]} mvp={mvp} showHeading={false} />
                ) : null}

                {showFinalResults && !showChampion ? (
                  <TournamentFinalResults
                    standings={standings}
                    mvp={mvp}
                    showHeading={false}
                  />
                ) : null}
              </section>
            ) : null}

            {showRegistrationSection ? (
              <TournamentRegisterForm
                layout="featured"
                slug={tournament.slug}
                game={tournament.game}
                registrationFormat={tournament.registrationFormat}
                isLoggedIn={isLoggedIn}
                alreadyRegistered={tournament.userRegistered}
                registrationOpen={tournament.registrationOpen}
                rulebookUrl={tournament.rulebookUrl}
                preview={registrationPreview ?? null}
                coCaptainSlots={tournament.coCaptainSlots}
                registrationProfileCard={registrationProfileCard ?? null}
                userParticipantRole={tournament.userParticipantRole}
              />
            ) : null}
          </div>

          {!isCompleted && (
            <aside className="order-2 space-y-8 lg:col-start-2 lg:row-start-1 lg:row-span-2">
              <TournamentScheduleCard schedule={scheduleCard} />

            {auctionHref ? (
              <div className="group relative overflow-hidden rounded-[1.25rem] p-[1px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 opacity-90 transition-all duration-300 group-hover:opacity-100" />
                
                <a
                  href={auctionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block w-full rounded-[19px] bg-[#0c0c0e]/95 px-6 py-4.5 text-center text-xs font-bold uppercase tracking-[0.25em] text-white transition-all duration-300 group-hover:bg-[#0c0c0e]/75"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    Enter Live Auction
                  </span>
                </a>
              </div>
            ) : auctionEnded ? (
              <div className="rounded-[1.25rem] border border-white/[0.06] bg-[#0c0c0e]/40 p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  Auction Ended
                </span>
              </div>
            ) : null}

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
          </aside>
          )}

          {showTeams ? (
            <div className="order-3 lg:col-start-1 lg:row-start-2">
              <TournamentTeamsList
                teams={tournament.teams}
                teamDetails={tournament.teamDetails}
                accentHex={meta.hex}
                game={tournament.game}
                registrationFormat={tournament.registrationFormat}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <section className="space-y-8">
          {brackets.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/[0.03] p-1.5 border border-white/[0.06] w-fit mb-6">
              {brackets.map((b, idx) => {
                const label = b.name || `Bracket ${idx + 1}`;
                return (
                  <button
                    key={b.url}
                    type="button"
                    onClick={() => setActiveStageIndex(idx)}
                    className={`rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-all ${
                      activeStageIndex === idx
                        ? "bg-[#22c55e] text-[#070a12] shadow-md shadow-emerald-500/20"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {brackets.length > 0 ? (
            [brackets[activeStageIndex] ?? brackets[0]].map(({ url, name: stageHeading, bracket }, index) => {
              const isAuction = tournament.registrationFormat === "AUCTION" || tournament.slug.includes("auc-cup");
              const displayBracket = bracket;

              const displayName = stageHeading
                ? `${tournament.name} — ${stageHeading}`
                : brackets.length > 1
                  ? `${tournament.name} — Stage ${index + 1}`
                  : tournament.name;

              const tournamentTeamsList =
                tournament.teams && tournament.teams.length > 0
                  ? tournament.teams
                  : tournament.teamDetails.map((t) => t.name);

              return (
                <div key={url}>
                  {displayBracket ? (
                    <TournamentBracket
                      bracket={displayBracket}
                      accentHex={meta.hex}
                      tournamentName={displayName}
                      stageName={stageHeading}
                      fallbackTeams={tournamentTeamsList}
                      format={
                        displayBracket.tournamentType
                          ?.toLowerCase()
                          .includes("round")
                          ? "Round Robin"
                          : displayBracket.tournamentType
                              ?.toLowerCase()
                              .includes("double")
                            ? "Double Elimination"
                            : isAuction
                              ? "Round Robin"
                              : "Single Elimination"
                      }
                    />
                  ) : (
                    <TournamentBracketEmpty />
                  )}
                </div>
              );
            })
          ) : generatedFallback ? (
            <TournamentBracket
              bracket={generatedFallback}
              accentHex={meta.hex}
              tournamentName={tournament.name}
              format={
                tournament.registrationFormat === "AUCTION" || tournament.slug.includes("auc-cup")
                  ? "Round Robin"
                  : "Single Elimination"
              }
            />
          ) : tournament.teams.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40">
              Loading brackets...
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/40">
              No brackets or teams available yet for this tournament.
            </div>
          )}
        </section>
      )}
    </article>
  );
}
