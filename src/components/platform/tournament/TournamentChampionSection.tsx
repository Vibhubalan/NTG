import type { GameSlug } from "@prisma/client";
import type { TournamentTeamPlayerView, TournamentTeamView } from "@core/contracts";
import type { ChampionResult } from "@/lib/tournament-champion";
import { rankIconUrl } from "@/lib/valorant-rank";
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

function playerRankIcon(player: TournamentTeamPlayerView): string | null {
  const fromTierId = rankIconUrl(player.valorantRankTierId);
  if (fromTierId) return fromTierId;
  if (!player.valorantRankTier) return null;
  return `/valorant/ranks/${player.valorantRankTier.replace(" ", "_")}_Rank.png`;
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

function RosterPlayerCard({
  player,
  game,
  isMvp = false,
}: {
  player: TournamentTeamPlayerView;
  game?: GameSlug;
  isMvp?: boolean;
}) {
  const isValorant = game === "VALORANT";
  const rankIcon = playerRankIcon(player);
  const secondary = game === "EA_FC26" ? player.olympusId : player.riotId;
  const role = player.participantRole ?? "PLAYER";
  const badge = ROLE_BADGE[role] ?? ROLE_BADGE.PLAYER!;

  return (
    <li
      className={`group relative aspect-[268/640] w-[100px] shrink-0 overflow-hidden rounded-2xl border-2 transition-[border-color,box-shadow] duration-300 sm:w-[155px] md:w-[180px] ${
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
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />

      {isMvp ? (
        <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/40 bg-violet-600/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-white shadow-[0_0_16px_rgba(139,92,246,0.6)] sm:px-2.5 sm:py-1 sm:text-[9px]">
            <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z" />
            </svg>
            MVP
          </span>
        </div>
      ) : null}

      <div className="relative z-10 flex h-full flex-col items-center justify-end p-2 text-center sm:p-4">
        {isValorant && rankIcon ? (
          <div className="mb-2 flex h-10 w-10 items-center justify-center sm:mb-3 sm:h-14 sm:w-14">
            <img src={rankIcon} alt="" className="h-full w-full object-contain drop-shadow-md" />
          </div>
        ) : null}

        <h3 className="max-w-full truncate font-display text-[10px] font-black leading-tight text-white drop-shadow-md sm:text-base">
          {player.displayName}
        </h3>
        {secondary ? (
          <p className="mt-0.5 max-w-full truncate text-[7px] font-medium text-white/50 sm:mt-1 sm:text-[10px]">
            {secondary}
          </p>
        ) : null}

        <span
          className="mt-2 rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-widest sm:mt-3 sm:px-3 sm:py-1 sm:text-[9px]"
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
    <section className="relative min-w-0 overflow-x-clip rounded-[1.75rem] border border-white/10 bg-[#06080f]/95 p-4 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.9)] sm:rounded-[2.5rem] sm:p-10 lg:p-12">
      <div className="pointer-events-none absolute -left-[15%] -top-[35%] h-[70%] w-[55%] rounded-full bg-amber-500/15 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-[35%] -right-[15%] h-[70%] w-[55%] rounded-full bg-violet-600/15 blur-[130px]" />

      <div className="relative z-10 flex min-w-0 flex-col items-center px-1 text-center sm:px-6">
        <p className="text-[10px] font-black tracking-[0.16em] text-amber-300/80 uppercase sm:text-xs sm:tracking-[0.28em]">
          Tournament Champions
        </p>

        <h2 className="mt-3 max-w-full break-words font-display text-[clamp(1.75rem,8vw,5rem)] font-black uppercase leading-[0.92] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-white to-amber-200/75">
          {championTeam.name}
        </h2>

        {runnerUpTeam ? (
          <p className="mt-4 max-w-full break-words px-1 text-[10px] font-medium tracking-[0.12em] text-white/40 uppercase sm:tracking-[0.18em]">
            Runner up · {runnerUpTeam.name}
          </p>
        ) : null}

        {players.length > 0 ? (
          <div className="mt-10 w-full max-w-6xl">
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              Championship Roster
            </p>
            <ul className="flex flex-wrap items-end justify-center gap-3 py-2 sm:gap-5">
              {players.map((player) => (
                <RosterPlayerCard
                  key={player.id}
                  player={player}
                  game={game}
                  isMvp={isMvpPlayer(player, mvpObj)}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {standaloneMvpPlayer ? (
          <div className="mt-10 w-full max-w-6xl">
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-200/70">
              Tournament MVP
            </p>
            <ul className="flex flex-wrap items-end justify-center gap-3 py-2 sm:gap-5">
              <RosterPlayerCard player={standaloneMvpPlayer} game={game} isMvp />
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
