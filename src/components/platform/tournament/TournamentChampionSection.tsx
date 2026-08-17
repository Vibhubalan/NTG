"use client";

import { useState } from "react";
import type { GameSlug } from "@prisma/client";
import type { TournamentTeamPlayerView, TournamentTeamView } from "@core/contracts";
import type { ChampionResult } from "@/lib/tournament-champion";
import { resolvePortraitCardArtUrl } from "@/lib/valorant-player-card";
import type { MvpData } from "./TournamentFinalResults";
import TournamentBestPlayersByRole from "./TournamentBestPlayersByRole";
import type { RolePlayerStat } from "@/lib/valorant-role-leaders";

const DEFAULT_VAL_CARD =
  "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png";

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  CAPTAIN: { label: "Captain", color: "#f6c177" },
  CO_CAPTAIN: { label: "Co-Captain", color: "#a78bfa" },
  PLAYER: { label: "Player", color: "#5eead4" },
};

const ROLE_ORDER: Record<string, number> = { CAPTAIN: 0, CO_CAPTAIN: 1, PLAYER: 2 };

type AccentTheme = "gold" | "silver";

const THEME = {
  gold: {
    glow: "bg-amber-500/15",
    eyebrow: "text-amber-300/80",
    title: "from-amber-100 via-white to-amber-200/75",
    cardBorder:
      "border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.12)] hover:border-amber-400/75 hover:shadow-[0_0_44px_rgba(245,158,11,0.4)]",
    cardHoverWash: "bg-gradient-to-tr from-amber-500/15 via-transparent to-amber-300/10",
    hairline: "bg-gradient-to-r from-transparent via-amber-300/65 to-transparent",
    tabActive: "text-amber-100",
    tabUnderline: "bg-amber-300/80",
  },
  silver: {
    glow: "bg-slate-300/12",
    eyebrow: "text-slate-300/85",
    title: "from-slate-100 via-white to-slate-300/80",
    cardBorder:
      "border-slate-300/45 shadow-[0_0_16px_rgba(203,213,225,0.12)] hover:border-slate-200/75 hover:shadow-[0_0_44px_rgba(203,213,225,0.35)]",
    cardHoverWash: "bg-gradient-to-tr from-slate-300/15 via-transparent to-slate-100/10",
    hairline: "bg-gradient-to-r from-transparent via-slate-200/65 to-transparent",
    tabActive: "text-slate-100",
    tabUnderline: "bg-slate-200/85",
  },
} as const;

function sortByRole(players: TournamentTeamPlayerView[]): TournamentTeamPlayerView[] {
  return [...players].sort(
    (a, b) =>
      (ROLE_ORDER[a.participantRole ?? "PLAYER"] ?? 2) -
      (ROLE_ORDER[b.participantRole ?? "PLAYER"] ?? 2),
  );
}

function normalizeMatch(value: string): string {
  return value.toLowerCase().trim();
}

function isMvpPlayer(player: TournamentTeamPlayerView, mvp: MvpData | null): boolean {
  if (!mvp) return false;
  if (mvp.userId && player.userId && mvp.userId === player.userId) return true;
  if (normalizeMatch(player.displayName) === normalizeMatch(mvp.displayName)) return true;
  if (mvp.riotId && player.riotId && normalizeMatch(player.riotId) === normalizeMatch(mvp.riotId)) {
    return true;
  }
  const mvpRiotName = mvp.riotId?.split("#")[0]?.trim();
  const playerRiotName = player.riotId?.split("#")[0]?.trim();
  if (mvpRiotName && playerRiotName && normalizeMatch(mvpRiotName) === normalizeMatch(playerRiotName)) {
    return true;
  }
  return false;
}

function playerCardArt(player: TournamentTeamPlayerView): string {
  return (
    resolvePortraitCardArtUrl(player.riotPlayerCard, player.riotPlayerCardWide) ??
    DEFAULT_VAL_CARD
  );
}

function findMvpPlayerInTeams(
  teams: TournamentTeamView[],
  mvp: MvpData,
): TournamentTeamPlayerView | null {
  for (const team of teams) {
    for (const player of team.players ?? []) {
      if (isMvpPlayer(player, mvp)) return player;
    }
  }
  return null;
}

function mvpDataToPlayerView(mvp: MvpData): TournamentTeamPlayerView {
  return {
    id: mvp.userId ? `mvp-${mvp.userId}` : `mvp-${mvp.displayName}`,
    userId: mvp.userId ?? null,
    displayName: mvp.displayName,
    riotId: mvp.riotId ?? null,
    valorantRankTier: mvp.rankTier ?? null,
    valorantRankTierId: mvp.valorantRankTierId ?? null,
    riotPlayerCard: mvp.riotPlayerCard ?? null,
    riotPlayerCardWide: mvp.riotPlayerCardWide ?? null,
    participantRole: "PLAYER",
  };
}

function chunkRows<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/** Roster Player Card Component with 3D Tilt & Specular Glare Animation */
function RosterPlayerCard({
  player,
  game,
  isMvp = false,
  theme = "gold",
}: {
  player: TournamentTeamPlayerView;
  game?: GameSlug;
  isMvp?: boolean;
  theme?: AccentTheme;
}) {
  const secondary = game === "EA_FC26" ? player.olympusId : player.riotId;
  const role = player.participantRole ?? "PLAYER";
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.PLAYER!;
  const accent = THEME[theme];

  // Subtle 3D tilt mouse interaction
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 8; // Gentle 8deg tilt
    const rotY = ((x - centerX) / centerX) * 8;

    setTilt({ rotX, rotY, active: true });
  };

  const handleMouseLeave = () => {
    setTilt({ rotX: 0, rotY: 0, active: false });
  };

  return (
    <li
      style={{ perspective: "800px" }}
      className="group relative aspect-[268/640] w-full max-w-[92px] shrink-0 sm:w-[140px] sm:max-w-none md:w-[160px] lg:w-[180px]"
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: tilt.active
            ? `rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg) scale3d(1.03, 1.03, 1.03)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transition: tilt.active
            ? "transform 0.08s ease-out"
            : "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)",
          transformStyle: "preserve-3d",
        }}
        className={`relative h-full w-full overflow-hidden rounded-xl border-2 bg-[#080b12] transition-all duration-300 sm:rounded-2xl ${
          isMvp
            ? "border-violet-400/60 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:border-violet-300 hover:shadow-[0_0_52px_rgba(139,92,246,0.7)]"
            : accent.cardBorder
        }`}
      >
        {/* Crystal Glass Reflection Overlay */}
        <div className="pointer-events-none absolute inset-0 z-15 bg-gradient-to-tr from-white/[0.03] via-transparent to-white/[0.08]" />

        {/* Dynamic 3D Specular Glass Glare Following Mouse */}
        {tilt.active ? (
          <div
            style={{
              background: `radial-gradient(circle at ${
                ((tilt.rotY + 8) / 16) * 100
              }% ${
                ((-tilt.rotX + 8) / 16) * 100
              }%, rgba(255,255,255,0.22) 0%, transparent 60%)`,
            }}
            className="pointer-events-none absolute inset-0 z-25 mix-blend-overlay transition-opacity duration-150"
          />
        ) : null}

        <div
          className={`pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
            isMvp
              ? "bg-gradient-to-tr from-violet-500/20 via-transparent to-fuchsia-400/15"
              : accent.cardHoverWash
          }`}
        />

        <img
          src={playerCardArt(player)}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_VAL_CARD;
          }}
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black from-[18%] via-black/70 via-[42%] to-transparent to-[72%]" />

        {isMvp ? (
          <div className="absolute left-1.5 top-1.5 z-20 sm:left-4 sm:top-4">
            <span className="inline-flex items-center gap-0.5 rounded-full border border-violet-300/40 bg-violet-600/90 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.14em] text-white shadow-[0_0_16px_rgba(139,92,246,0.6)] sm:gap-1 sm:px-2.5 sm:py-1 sm:text-[9px] sm:tracking-[0.18em]">
              <svg className="h-2 w-2 sm:h-3 sm:w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
              </svg>
              MVP
            </span>
          </div>
        ) : null}

        <div
          style={{ transform: "translateZ(18px)" }}
          className="relative z-10 flex h-full flex-col items-center justify-end px-1.5 pb-2 pt-8 text-center sm:px-3 sm:pb-4 sm:pt-12"
        >
          <div
            className={`mb-1.5 h-px w-8 sm:mb-2.5 sm:w-12 ${
              isMvp
                ? "bg-gradient-to-r from-transparent via-violet-300/70 to-transparent"
                : accent.hairline
            }`}
          />
          <h3 className="max-w-full truncate font-display text-[11px] font-black leading-[1.1] tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-lg sm:tracking-[0.02em]">
            {player.displayName}
          </h3>
          {secondary ? (
            <p className="mt-0.5 max-w-full truncate text-[8px] font-semibold tracking-wide text-white/55 sm:mt-1 sm:text-[11px]">
              {secondary}
            </p>
          ) : null}

          <span
            className="mt-2 rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] sm:mt-3 sm:px-3 sm:py-1 sm:text-[9px] sm:tracking-[0.2em]"
            style={{
              background: isMvp ? "#a78bfa22" : `${badge.color}22`,
              color: isMvp ? "#ddd6fe" : badge.color,
              borderColor: isMvp ? "#a78bfa55" : `${badge.color}35`,
            }}
          >
            {badge.label}
          </span>
        </div>
      </div>
    </li>
  );
}

type Props = {
  championData: ChampionResult;
  game?: GameSlug;
  accentHex?: string;
  mvp?: string | MvpData | null;
  allTeams?: TournamentTeamView[];
  bestRolePlayers?: RolePlayerStat[];
};

type ViewMode = "winners" | "runners";

export default function TournamentChampionSection({
  championData,
  game,
  mvp,
  allTeams = [],
  bestRolePlayers,
}: Props) {
  const { championTeam, runnerUpTeam } = championData;
  const [view, setView] = useState<ViewMode>("winners");
  const hasRunnerUp = Boolean(runnerUpTeam);
  const activeView: ViewMode = view === "runners" && hasRunnerUp ? "runners" : "winners";
  const theme: AccentTheme = activeView === "runners" ? "silver" : "gold";
  const accent = THEME[theme];

  const activeTeam = activeView === "runners" && runnerUpTeam ? runnerUpTeam : championTeam;
  const otherTeam =
    activeView === "runners" ? championTeam : runnerUpTeam ?? null;
  const players = sortByRole(activeTeam.players ?? []);

  const mvpObj =
    typeof mvp === "object" && mvp
      ? mvp
      : typeof mvp === "string" && mvp.trim()
        ? { displayName: mvp }
        : null;

  const showMvp = activeView === "winners";
  const mvpOnChampionRoster =
    showMvp && mvpObj ? players.some((p) => isMvpPlayer(p, mvpObj)) : false;
  const mvpPlayerFromTeams = showMvp && mvpObj ? findMvpPlayerInTeams(allTeams, mvpObj) : null;
  const standaloneMvpPlayer =
    showMvp && mvpObj && !mvpOnChampionRoster
      ? mvpPlayerFromTeams ?? mvpDataToPlayerView(mvpObj)
      : null;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex items-center justify-center gap-6 sm:gap-10">
        {(
          [
            { id: "winners" as const, label: "Winners", disabled: false },
            { id: "runners" as const, label: "Runners Up", disabled: !hasRunnerUp },
          ] as const
        ).map((tab) => {
          const active = activeView === tab.id;
          const tabTheme = tab.id === "runners" ? THEME.silver : THEME.gold;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => setView(tab.id)}
              className={`relative pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] transition-colors duration-300 sm:text-[11px] sm:tracking-[0.32em] ${
                active
                  ? tabTheme.tabActive
                  : "text-white/35 hover:text-white/65"
              } disabled:cursor-not-allowed disabled:opacity-30`}
            >
              {tab.label}
              <span
                className={`absolute inset-x-1 -bottom-px h-px transition-opacity duration-300 ${
                  active ? `opacity-100 ${tabTheme.tabUnderline}` : "opacity-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      <section className="relative isolate min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#06080f]/95 p-3 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.9)] sm:rounded-[2.5rem] sm:p-10 lg:p-12">
        <div className={`pointer-events-none absolute -left-[15%] -top-[35%] h-[70%] w-[55%] rounded-full blur-[130px] ${accent.glow}`} />
        {/* Bottom-right wash: purple with MVP, silver for runners up. */}
        {showMvp && mvpObj ? (
          <div className="pointer-events-none absolute -bottom-[35%] -right-[15%] h-[70%] w-[55%] rounded-full bg-violet-600/15 blur-[130px]" />
        ) : activeView === "runners" ? (
          <div className="pointer-events-none absolute -bottom-[35%] -right-[15%] h-[70%] w-[55%] rounded-full bg-slate-300/14 blur-[130px]" />
        ) : null}

        <div className="relative z-10 flex min-w-0 flex-col items-center px-0.5 text-center sm:px-6">
          <p className={`text-[9px] font-black tracking-[0.14em] uppercase sm:text-xs sm:tracking-[0.28em] ${accent.eyebrow}`}>
            {activeView === "runners" ? "Tournament Runner Up" : "Tournament Champions"}
          </p>

          <h2
            className={`mt-1.5 max-w-full break-words font-display text-[clamp(1.45rem,7.5vw,5rem)] font-black uppercase leading-[0.92] tracking-tight text-transparent bg-clip-text bg-gradient-to-b sm:mt-3 ${accent.title}`}
          >
            {activeTeam.name}
          </h2>

          {otherTeam ? (
            <p className="mt-2 max-w-full break-words px-1 text-[9px] font-medium tracking-[0.1em] text-white/40 uppercase sm:mt-4 sm:text-[10px] sm:tracking-[0.18em]">
              {activeView === "runners" ? "Champions" : "Runner up"} · {otherTeam.name}
            </p>
          ) : null}

          {players.length > 0 ? (
            <div className="mt-5 w-full sm:mt-10">
              <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 sm:mb-5 sm:text-[10px] sm:tracking-[0.22em]">
                {activeView === "runners" ? "Runner-up Roster" : "Championship Roster"}
              </p>
              {/* Mobile Roster Display */}
              <div className="space-y-2 sm:hidden">
                {chunkRows(players, 3).map((row, rowIdx) => (
                  <ul key={`m-${rowIdx}`} className="flex justify-center gap-2">
                    {row.map((player) => (
                      <RosterPlayerCard
                        key={player.id}
                        player={player}
                        game={game}
                        theme={theme}
                        isMvp={showMvp && isMvpPlayer(player, mvpObj)}
                      />
                    ))}
                  </ul>
                ))}
              </div>
              {/* Desktop Roster Display */}
              <div className="hidden space-y-5 sm:block">
                {chunkRows(players, 5).map((row, rowIdx) => (
                  <ul key={`d-${rowIdx}`} className="flex justify-center gap-3 md:gap-5">
                    {row.map((player) => (
                      <RosterPlayerCard
                        key={player.id}
                        player={player}
                        game={game}
                        theme={theme}
                        isMvp={showMvp && isMvpPlayer(player, mvpObj)}
                      />
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          ) : null}

          {standaloneMvpPlayer ? (
            <div className="mt-5 w-full max-w-6xl sm:mt-10">
              <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-200/70 sm:mb-5 sm:text-[10px] sm:tracking-[0.22em]">
                Tournament MVP
              </p>
              <ul className="flex flex-wrap items-end justify-center gap-2 py-1 sm:gap-5 sm:py-2">
                <RosterPlayerCard player={standaloneMvpPlayer} game={game} isMvp />
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* Valorant Role Leaders — only with Champions (tournament decided) */}
      {game === "VALORANT" && bestRolePlayers && bestRolePlayers.length > 0 ? (
        <div className="pt-2 sm:pt-4">
          <TournamentBestPlayersByRole
            players={bestRolePlayers}
            allTeams={allTeams}
          />
        </div>
      ) : null}
    </div>
  );
}
