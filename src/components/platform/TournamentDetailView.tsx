"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import BrandIcon from "@/components/ui/BrandIcon";
import StatusBadge from "@/components/platform/ui/StatusBadge";
import TournamentBracketEmpty from "@/components/platform/tournament/TournamentBracketEmpty";
import TournamentChampionSection from "@/components/platform/tournament/TournamentChampionSection";
import TournamentFinalResults from "@/components/platform/tournament/TournamentFinalResults";
import TournamentScheduleCard from "@/components/platform/tournament/TournamentScheduleCard";
import TournamentTeamsList from "@/components/platform/tournament/TournamentTeamsList";
import TournamentGamesSection, {
  type PublicGame,
} from "@/components/platform/tournament/TournamentGamesSection";
import type { TournamentStatsEligibility } from "@/lib/tournament-stats";
import TournamentStatsSection from "@/components/platform/tournament/TournamentStatsSection";
import { resolveChampion } from "@/lib/tournament-champion";
import { gameMetaFor, formatRegistrationLabel, buildTournamentScheduleCardView } from "@/lib/tournament-display";
import {
  loadTournamentBrackets,
  loadTournamentGames,
} from "@/lib/prefetch-tournament-cup";
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
  /** ADMIN / ADMIN_EMAILS — gates Stats export control. */
  isAdmin?: boolean;
  registrationPreview?: RegistrationPreview | null;
  registrationProfileCard?: ValorantRegistrationProfileCard | null;
  auctionHref?: string | null;
  auctionEnded?: boolean;
  /** When set, overrides tournament.yourGamesEnabled for tab visibility. */
  showMatchesTab?: boolean;
  /** SSR-published custom games for the Matches tab. */
  publishedGames?: PublicGame[];
  /** Official primary/poach memberships for Stats filtering. */
  statsEligibility?: TournamentStatsEligibility;
};

export default function TournamentDetailView({
  tournament,
  brackets: initialBrackets,
  isLoggedIn,
  isAdmin = false,
  registrationPreview,
  registrationProfileCard,
  auctionHref,
  auctionEnded,
  showMatchesTab: showMatchesTabProp,
  publishedGames,
  statsEligibility: initialStatsEligibility,
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "brackets" | "matches" | "stats">("overview");
  // null = the visitor hasn't picked a stage, so follow the latest one. Brackets
  // arrive asynchronously, so this is derived rather than seeded in useState —
  // at first render the list is usually still empty.
  const [pickedStageIndex, setPickedStageIndex] = useState<number | null>(null);
  const [generatedFallback, setGeneratedFallback] = useState<TournamentBracketView | null>(null);
  const [brackets, setBrackets] = useState(initialBrackets);
  const [bracketsLoading, setBracketsLoading] = useState(false);
  const bracketsFetchStarted = useRef(false);
  const [statsGames, setStatsGames] = useState<PublicGame[] | undefined>(publishedGames);
  const [statsEligibility, setStatsEligibility] = useState(initialStatsEligibility);
  const [statsLoading, setStatsLoading] = useState(false);
  const statsFetchStarted = useRef(false);
  const showMatchesTab = showMatchesTabProp ?? tournament.yourGamesEnabled ?? true;
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
  // Later entries are later stages, so the last one is the live/most recent
  // bracket — that's what a visitor opening the tab wants to see, not Stage 1.
  const latestStageIndex = Math.max(brackets.length - 1, 0);
  const activeStageIndex =
    pickedStageIndex !== null && pickedStageIndex < brackets.length
      ? pickedStageIndex
      : latestStageIndex;

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

  const championsFullWidth = showChampion;
  const useSingleColOverview = championsFullWidth || isCompleted;
  const showMetaSidebar = !championsFullWidth && !isCompleted;

  // Auction rank only until the auction window ends (then the cup is "live").
  const showAuctionRank = (() => {
    if (tournament.registrationFormat !== "AUCTION") return false;
    if (tournament.status === "COMPLETED" || tournament.status === "CANCELLED") return false;
    const end = tournament.auctionEndsAt ? new Date(tournament.auctionEndsAt) : null;
    if (end && !Number.isNaN(end.getTime())) return Date.now() < end.getTime();
    // No end date: hide once cup start has passed
    const start = tournament.startsAt ? new Date(tournament.startsAt) : null;
    if (start && !Number.isNaN(start.getTime())) return Date.now() < start.getTime();
    return true;
  })();

  const auctionBlock = auctionHref ? (
    <div className="group relative min-w-0 overflow-hidden rounded-[1.25rem] p-[1px] shadow-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)]">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 opacity-90 transition-all duration-300 group-hover:opacity-100" />
      <a
        href={auctionHref}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block w-full rounded-[19px] bg-[#0c0c0e]/95 px-4 py-4 text-center text-[11px] font-bold tracking-[0.14em] text-white uppercase transition-all duration-300 group-hover:bg-[#0c0c0e]/75 sm:px-6 sm:py-4.5 sm:text-xs sm:tracking-[0.25em]"
      >
        <span className="relative z-10 flex items-center justify-center gap-2.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
          Enter Live Auction
        </span>
      </a>
    </div>
  ) : auctionEnded ? (
    <div className="rounded-[1.25rem] border border-white/[0.06] bg-[#0c0c0e]/40 p-4 text-center">
      <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
        Auction Ended
      </span>
    </div>
  ) : null;

  const prizeBlock =
    tournament.prizePool || tournament.prizeNotes ? (
      <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#0A0A0A]/80 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
        <p className="text-[10px] font-medium tracking-[0.2em] text-white/40 uppercase">
          Prizepool
        </p>
        {tournament.prizePool ? (
          <p className="mt-1.5 break-words font-display text-2xl font-black tracking-tight text-white drop-shadow-md sm:text-3xl">
            ₹{Number(tournament.prizePool).toLocaleString("en-IN")}
          </p>
        ) : null}
        {tournament.prizeNotes ? (
          <p className="mt-2 text-[13px] leading-snug font-medium break-words text-white/50">
            {tournament.prizeNotes}
          </p>
        ) : null}

        {prizeSplit.length > 0 ? (
          <div className="mt-3.5 border-t border-white/[0.06] pt-3.5">
            <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
              Prize Split
            </p>
            <div className="space-y-2">
              {prizeSplit.map((row, i) => (
                <div
                  key={row.place}
                  className="flex min-w-0 items-center justify-between gap-3"
                >
                  <span
                    className={`flex min-w-0 items-center gap-2 text-[13px] font-medium ${splitColors[i] ?? "text-white/70"}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${splitBadgeColors[i] ?? "bg-white/10 text-white/70"}`}
                    >
                      {row.place}
                    </span>
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="shrink-0 font-display text-sm font-bold text-white/90">
                    ₹{row.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

  // Warm the heavy bracket UI chunk while the user is still on Overview.
  useEffect(() => {
    void import("@/components/platform/tournament/TournamentBracket");
  }, []);

  useEffect(() => {
    if (bracketsFetchStarted.current) return;
    if (initialBrackets.length === 0) return;
    if (initialBrackets.some((b) => b.bracket != null)) {
      bracketsFetchStarted.current = true;
      return;
    }

    bracketsFetchStarted.current = true;
    let cancelled = false;
    let finished = false;
    setBracketsLoading(true);
    // Reuses list/hero hover prefetch when that request is already in flight.
    void loadTournamentBrackets(tournament.slug)
      .then((data) => {
        if (cancelled || !data?.brackets) return;
        finished = true;
        setBrackets(data.brackets);
      })
      .finally(() => {
        if (!cancelled) setBracketsLoading(false);
      });

    return () => {
      cancelled = true;
      if (!finished) bracketsFetchStarted.current = false;
    };
  }, [initialBrackets, tournament.slug]);

  useEffect(() => {
    if (bracketsLoading) return;
    if (brackets.some((b) => b.bracket)) return;
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
  }, [brackets, bracketsLoading, tournament.teams, tournament.registrationFormat, tournament.slug, tournament.name]);

  useEffect(() => {
    if (statsFetchStarted.current) return;
    if (Array.isArray(publishedGames)) {
      statsFetchStarted.current = true;
      setStatsGames(publishedGames);
      return;
    }

    statsFetchStarted.current = true;
    let cancelled = false;
    setStatsLoading(true);
    void loadTournamentGames(tournament.slug)
      .then((data) => {
        if (cancelled || !data) return;
        setStatsGames((data.games as PublicGame[] | undefined) ?? []);
        if (data.statsEligibility) setStatsEligibility(data.statsEligibility);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publishedGames, tournament.slug]);

  return (
    <article className="min-w-0 max-w-full overflow-x-clip pb-24">
      <div className="relative mb-8 flex min-h-[18rem] flex-col justify-end isolate overflow-hidden rounded-[1.5rem] border border-white/[0.08] p-5 shadow-2xl sm:mb-12 sm:min-h-[30rem] sm:rounded-[2rem] sm:p-8 md:p-12">
        <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
          <Image
            src={posterSrc}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover object-center opacity-80"
          />
        </div>
        <div className="absolute inset-0 z-0 rounded-[inherit] bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />

        <div className="relative z-10 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-col items-start gap-3 sm:gap-4">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#050505]/90 ring-1 ring-white/10 backdrop-blur-md sm:h-16 sm:w-16"
              style={{ color: meta.hex, boxShadow: `0 0 50px -10px ${meta.hex}80` }}
            >
              <BrandIcon path={meta.iconPath} title={tournament.name} className="h-6 w-6 drop-shadow-md sm:h-8 sm:w-8" />
            </span>
            <div className="flex min-w-0 flex-col items-start">
              <StatusBadge status={tournament.status} />
              <h1 className="mt-2 break-words font-display text-3xl font-black tracking-tight text-white uppercase drop-shadow-lg sm:mt-3 sm:text-5xl md:text-6xl">
                {tournament.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium tracking-[0.14em] text-white/60 uppercase sm:mt-4 sm:text-sm sm:tracking-[0.2em]">
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

      <div className="mb-8 min-w-0 border-b border-white/[0.08] pb-4 sm:mb-10">
        <div
          className={`grid w-full gap-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1 sm:flex sm:w-fit sm:flex-wrap sm:items-center sm:gap-1.5 sm:p-1.5 ${
            showMatchesTab ? "grid-cols-4" : "grid-cols-2"
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`rounded-xl px-1 py-2.5 text-center text-[9px] font-bold tracking-[0.08em] uppercase transition-all sm:px-6 sm:text-xs sm:tracking-[0.2em] ${
              activeTab === "overview"
                ? "bg-white text-black shadow-lg"
                : "text-white/50 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("brackets")}
            className={`rounded-xl px-1 py-2.5 text-center text-[9px] font-bold tracking-[0.08em] uppercase transition-all sm:px-6 sm:text-xs sm:tracking-[0.2em] ${
              activeTab === "brackets"
                ? "bg-[#22c55e] text-[#070a12] shadow-lg shadow-emerald-500/20"
                : "text-white/50 hover:text-white"
            }`}
          >
            Brackets
          </button>
          {showMatchesTab ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("matches")}
                className={`rounded-xl px-1 py-2.5 text-center text-[9px] font-bold tracking-[0.08em] uppercase transition-all sm:px-6 sm:text-xs sm:tracking-[0.2em] ${
                  activeTab === "matches"
                    ? "bg-amber-400 text-[#070a12] shadow-lg shadow-amber-500/20"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Matches
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("stats")}
                className={`rounded-xl px-1 py-2.5 text-center text-[9px] font-bold tracking-[0.08em] uppercase transition-all sm:px-6 sm:text-xs sm:tracking-[0.2em] ${
                  activeTab === "stats"
                    ? "bg-cyan-400 text-[#070a12] shadow-lg shadow-cyan-500/20"
                    : "text-white/50 hover:text-white"
                }`}
              >
                Stats
              </button>
            </>
          ) : null}
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className={`grid min-w-0 gap-6 sm:gap-8 lg:items-start ${useSingleColOverview ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_22rem]"}`}>
          <div className="order-1 min-w-0 space-y-8 sm:space-y-10 lg:col-start-1 lg:row-start-1">
            {showResultsBlock ? (
              <section className="min-w-0 space-y-6 sm:space-y-8">
                <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                  <div className="hidden h-px w-10 shrink-0 bg-gradient-to-r from-transparent to-amber-300/70 sm:block" />
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-400/10 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.12)] sm:h-8 sm:w-8">
                      <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
                      </svg>
                    </span>
                    <h2 className="min-w-0 font-display text-xl font-black tracking-[0.1em] text-transparent uppercase bg-clip-text bg-gradient-to-r from-white via-amber-100 to-white/70 sm:text-3xl sm:tracking-[0.18em]">
                      Final Results
                    </h2>
                  </div>
                  <div className="h-px min-w-0 flex-1 bg-gradient-to-r from-amber-300/40 to-transparent" />
                </div>

                {showChampion && championData ? (
                  <TournamentChampionSection
                    championData={championData}
                    game={tournament.game}
                    accentHex={meta.hex}
                    mvp={mvp}
                    allTeams={tournament.teamDetails}
                  />
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

            {championsFullWidth ? (
              <div className="grid min-w-0 gap-8 md:grid-cols-2">
                <TournamentScheduleCard schedule={scheduleCard} />
                <div className="min-w-0 space-y-8">
                  {auctionBlock}
                  {prizeBlock}
                </div>
              </div>
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
                showAuctionRank={showAuctionRank}
                tournamentGames={statsGames ?? publishedGames ?? null}
                statsEligibility={statsEligibility ?? null}
              />
            ) : null}
          </div>

          {showMetaSidebar ? (
            <aside className="order-2 min-w-0 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <TournamentScheduleCard schedule={scheduleCard} />
              {auctionBlock}
              {prizeBlock}
            </aside>
          ) : null}

          {showTeams ? (
            <div className={`order-3 min-w-0 ${showMetaSidebar ? "lg:col-start-1 lg:row-start-2" : ""}`}>
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
      ) : activeTab === "matches" && showMatchesTab ? (
        <section className="space-y-6">
          <TournamentGamesSection
            slug={tournament.slug}
            initialGames={publishedGames}
          />
        </section>
      ) : activeTab === "stats" && showMatchesTab ? (
        <section className="space-y-6">
          {statsLoading || statsGames === undefined ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40">
              Loading stats...
            </div>
          ) : (
            <TournamentStatsSection
              slug={tournament.slug}
              games={statsGames}
              eligibility={statsEligibility}
              isAdmin={isAdmin}
            />
          )}
        </section>
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
                    onClick={() => setPickedStageIndex(idx)}
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
            (() => {
              const currentItem = brackets[activeStageIndex] ?? brackets[0];
              const { url, name: stageHeading, bracket: displayBracket } = currentItem;
              const isAuction =
                tournament.registrationFormat === "AUCTION" ||
                tournament.slug.includes("auc-cup");

              const bracketLabel =
                stageHeading ||
                (brackets.length > 1 ? `Bracket ${activeStageIndex + 1}` : null);

              const displayName = bracketLabel
                ? `${tournament.name} — ${bracketLabel}`
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
                      stageName={bracketLabel}
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
                  ) : bracketsLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40">
                      Loading brackets...
                    </div>
                  ) : (
                    <TournamentBracketEmpty />
                  )}
                </div>
              );
            })()
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
