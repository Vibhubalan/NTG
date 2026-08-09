import type { GameSlug } from "@prisma/client";
import type { TournamentTeamPlayerView, TournamentTeamView } from "@core/contracts";
import type { ChampionResult } from "@/lib/tournament-champion";
import { resolvePortraitCardArtUrl } from "@/lib/valorant-player-card";
import type { MvpData } from "./TournamentFinalResults";

const DEFAULT_VAL_CARD =
  "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png";

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  CAPTAIN: { label: "Captain", color: "#f6c177" },
  CO_CAPTAIN: { label: "Co-Captain", color: "#a78bfa" },
  PLAYER: { label: "Player", color: "#5eead4" },
};

const ROLE_ORDER: Record<string, number> = { CAPTAIN: 0, CO_CAPTAIN: 1, PLAYER: 2 };

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

function RosterPlayerCard({
  player,
  game,
  isMvp = false,
}: {
  player: TournamentTeamPlayerView;
  game?: GameSlug;
  isMvp?: boolean;
}) {
  const secondary = game === "EA_FC26" ? player.olympusId : player.riotId;
  const role = player.participantRole ?? "PLAYER";
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.PLAYER!;

  return (
    <li
      className={`group relative aspect-[268/640] w-full max-w-[92px] shrink-0 overflow-hidden rounded-xl border-2 transition-[border-color,box-shadow] duration-300 sm:w-[140px] sm:max-w-none sm:rounded-2xl md:w-[160px] lg:w-[180px] ${
        isMvp
          ? "border-violet-400/60 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:border-violet-300 hover:shadow-[0_0_52px_rgba(139,92,246,0.7)]"
          : "border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.12)] hover:border-amber-400/75 hover:shadow-[0_0_44px_rgba(245,158,11,0.4)]"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
          isMvp
            ? "bg-gradient-to-tr from-violet-500/20 via-transparent to-fuchsia-400/15"
            : "bg-gradient-to-tr from-amber-500/15 via-transparent to-amber-300/10"
        }`}
      />

      <img
        src={playerCardArt(player)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top"
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

      <div className="relative z-10 flex h-full flex-col items-center justify-end px-1.5 pb-2 pt-8 text-center sm:px-3 sm:pb-4 sm:pt-12">
        <div
          className={`mb-1.5 h-px w-8 sm:mb-2.5 sm:w-12 ${
            isMvp
              ? "bg-gradient-to-r from-transparent via-violet-300/70 to-transparent"
              : "bg-gradient-to-r from-transparent via-amber-300/65 to-transparent"
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
    </li>
  );
}

type Props = {
  championData: ChampionResult;
  game?: GameSlug;
  accentHex?: string;
  mvp?: string | MvpData | null;
  allTeams?: TournamentTeamView[];
};

export default function TournamentChampionSection({
  championData,
  game,
  mvp,
  allTeams = [],
}: Props) {
  const { championTeam, runnerUpTeam } = championData;
  const players = sortByRole(championTeam.players ?? []);
  const mvpObj =
    typeof mvp === "object" && mvp
      ? mvp
      : typeof mvp === "string" && mvp.trim()
        ? { displayName: mvp }
        : null;

  const mvpOnChampionRoster = mvpObj ? players.some((p) => isMvpPlayer(p, mvpObj)) : false;
  const mvpPlayerFromTeams = mvpObj ? findMvpPlayerInTeams(allTeams, mvpObj) : null;
  const standaloneMvpPlayer =
    mvpObj && !mvpOnChampionRoster
      ? mvpPlayerFromTeams ?? mvpDataToPlayerView(mvpObj)
      : null;

  return (
    <section className="relative isolate min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#06080f]/95 p-3 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.9)] sm:rounded-[2.5rem] sm:p-10 lg:p-12">
      <div className="pointer-events-none absolute -left-[15%] -top-[35%] h-[70%] w-[55%] rounded-full bg-amber-500/15 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-[35%] -right-[15%] h-[70%] w-[55%] rounded-full bg-violet-600/15 blur-[130px]" />

      <div className="relative z-10 flex min-w-0 flex-col items-center px-0.5 text-center sm:px-6">
        <p className="text-[9px] font-black tracking-[0.14em] text-amber-300/80 uppercase sm:text-xs sm:tracking-[0.28em]">
          Tournament Champions
        </p>

        <h2 className="mt-1.5 max-w-full break-words font-display text-[clamp(1.45rem,7.5vw,5rem)] font-black uppercase leading-[0.92] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-white to-amber-200/75 sm:mt-3">
          {championTeam.name}
        </h2>

        {runnerUpTeam ? (
          <p className="mt-2 max-w-full break-words px-1 text-[9px] font-medium tracking-[0.1em] text-white/40 uppercase sm:mt-4 sm:text-[10px] sm:tracking-[0.18em]">
            Runner up · {runnerUpTeam.name}
          </p>
        ) : null}

        {players.length > 0 ? (
          <div className="mt-5 w-full sm:mt-10">
            <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 sm:mb-5 sm:text-[10px] sm:tracking-[0.22em]">
              Championship Roster
            </p>
            {/* Mobile: 3 per row, centered leftovers */}
            <div className="space-y-2 sm:hidden">
              {chunkRows(players, 3).map((row, rowIdx) => (
                <ul key={`m-${rowIdx}`} className="flex justify-center gap-2">
                  {row.map((player) => (
                    <RosterPlayerCard
                      key={player.id}
                      player={player}
                      game={game}
                      isMvp={isMvpPlayer(player, mvpObj)}
                    />
                  ))}
                </ul>
              ))}
            </div>
            {/* Desktop: 5 per row, centered leftovers on the next line */}
            <div className="hidden space-y-5 sm:block">
              {chunkRows(players, 5).map((row, rowIdx) => (
                <ul key={`d-${rowIdx}`} className="flex justify-center gap-3 md:gap-5">
                  {row.map((player) => (
                    <RosterPlayerCard
                      key={player.id}
                      player={player}
                      game={game}
                      isMvp={isMvpPlayer(player, mvpObj)}
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
  );
}
