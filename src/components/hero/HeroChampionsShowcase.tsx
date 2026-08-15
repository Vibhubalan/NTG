"use client";

import { useState } from "react";
import Link from "next/link";
import type { GameSlug } from "@prisma/client";
import type { TournamentTeamPlayerView } from "@core/contracts";
import { resolvePortraitCardArtUrl } from "@/lib/valorant-player-card";
import type { HeroChampionsSlideData } from "./hero-carousel-types";

const DEFAULT_VAL_CARD =
  "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png";

const ROLE_ORDER: Record<string, number> = { CAPTAIN: 0, CO_CAPTAIN: 1, PLAYER: 2 };

const THEME = {
  gold: {
    cardBorder:
      "border-amber-400/40 hover:border-amber-300/80 shadow-[0_8px_30px_rgba(245,158,11,0.15)]",
    glowWash: "from-amber-500/15 via-amber-300/5 to-transparent",
    hairline: "bg-gradient-to-r from-transparent via-amber-300/70 to-transparent",
  },
  mvp: {
    cardBorder:
      "border-violet-400/50 hover:border-violet-300/80 shadow-[0_8px_30px_rgba(139,92,246,0.2)]",
    glowWash: "from-violet-500/20 via-fuchsia-400/8 to-transparent",
    hairline: "bg-gradient-to-r from-transparent via-violet-300/70 to-transparent",
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

function isMvpPlayer(player: TournamentTeamPlayerView, data: HeroChampionsSlideData): boolean {
  const mvp = data.mvp;
  if (!mvp) return false;
  if (mvp.userId && player.userId && mvp.userId === player.userId) return true;
  if (normalizeMatch(player.displayName) === normalizeMatch(mvp.displayName)) return true;
  if (mvp.riotId && player.riotId && normalizeMatch(player.riotId) === normalizeMatch(mvp.riotId)) {
    return true;
  }
  return false;
}

function playerCardArt(player: TournamentTeamPlayerView): string {
  return (
    resolvePortraitCardArtUrl(player.riotPlayerCard, player.riotPlayerCardWide) ?? DEFAULT_VAL_CARD
  );
}

function cardSecondary(player: TournamentTeamPlayerView, game?: GameSlug): string | null {
  if (game === "EA_FC26") return player.olympusId ?? null;
  return player.riotId;
}

function HeroPlayerCard({
  player,
  game,
  isMvp,
  theme,
}: {
  player: TournamentTeamPlayerView;
  game?: GameSlug;
  isMvp: boolean;
  theme: "gold";
}) {
  const secondary = cardSecondary(player, game);
  const accent = isMvp ? THEME.mvp : THEME[theme];
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, active: false });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotX = -((y - rect.height / 2) / (rect.height / 2)) * 8;
    const rotY = ((x - rect.width / 2) / (rect.width / 2)) * 8;
    setTilt({ rotX, rotY, active: true });
  }

  return (
    <li style={{ perspective: "800px" }} className="group relative min-w-0">
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ rotX: 0, rotY: 0, active: false })}
        style={{
          transform: tilt.active
            ? `rotateX(${tilt.rotX}deg) rotateY(${tilt.rotY}deg) scale3d(1.03, 1.03, 1.03)`
            : "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
          transition: tilt.active
            ? "transform 0.08s ease-out"
            : "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)",
          transformStyle: "preserve-3d",
        }}
        className={`relative aspect-[268/640] w-full overflow-hidden rounded-lg border bg-[#080b12] transition-all duration-300 sm:rounded-2xl sm:border-2 ${accent.cardBorder}`}
      >
        <img
          src={playerCardArt(player)}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_VAL_CARD;
          }}
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="pointer-events-none absolute inset-0 z-[15] bg-gradient-to-tr from-white/[0.03] via-transparent to-white/[0.08]" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black from-[22%] via-black/75 via-[48%] to-transparent to-[80%]" />
        <div
          className={`pointer-events-none absolute inset-0 z-20 bg-gradient-to-tr opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${accent.glowWash}`}
        />
        {tilt.active ? (
          <div
            style={{
              background: `radial-gradient(circle at ${((tilt.rotY + 8) / 16) * 100}% ${
                ((-tilt.rotX + 8) / 16) * 100
              }%, rgba(255,255,255,0.22) 0%, transparent 60%)`,
            }}
            className="pointer-events-none absolute inset-0 z-[25] mix-blend-overlay transition-opacity duration-150"
          />
        ) : null}

        {isMvp ? (
          <span className="absolute left-1 top-1 z-30 rounded-full border border-violet-300/40 bg-[#0a0c14]/90 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.12em] text-violet-200 sm:left-2 sm:top-2.5 sm:px-2 sm:py-1 sm:text-[8px]">
            MVP
          </span>
        ) : null}

        <div
          style={{ transform: "translateZ(18px)" }}
          className="relative z-20 flex h-full flex-col items-center justify-end px-0.5 pb-1.5 pt-5 text-center sm:px-2.5 sm:pb-3 sm:pt-10"
        >
          <div className={`mb-0.5 h-px w-3.5 sm:mb-2 sm:w-10 ${accent.hairline}`} />
          <h3 className="max-w-full truncate font-display text-[9px] font-black leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-sm sm:tracking-[0.02em]">
            {player.displayName}
          </h3>
          {secondary ? (
            <p className="mt-0.5 max-w-full truncate text-[7px] font-semibold tracking-wide text-white/55 sm:mt-1 sm:text-[10px]">
              {secondary}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function HeroChampionsShowcase({ data }: { data: HeroChampionsSlideData }) {
  const { championData, game, tournamentName, tournamentSlug } = data;
  const championTeam = championData.championTeam;
  const runnerUp = championData.runnerUpTeam ?? null;
  const players = sortByRole(championTeam.players ?? []);
  const count = Math.max(players.length, 1);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center px-6 pb-12 pt-32 sm:pt-36">
      <div className="relative z-10 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.42em] text-white/40">
          <Link
            href={`/esports/tournaments/${tournamentSlug}`}
            className="transition-colors hover:text-white/70"
          >
            {tournamentName}
          </Link>
        </p>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-white sm:text-[11px]">
          Winners
        </p>
        <h2 className="mt-3 font-display text-[clamp(1.45rem,3.4vw,2.85rem)] font-semibold uppercase leading-[0.95] tracking-[-0.04em] text-white">
          {championTeam.name}
        </h2>
        {runnerUp ? (
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-white/35 sm:text-[11px]">
            Runner up · {runnerUp.name}
          </p>
        ) : null}
      </div>

      {players.length > 0 ? (
        <ul
          className="relative z-10 mt-8 grid w-full items-end sm:mt-10"
          style={{
            gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
            gap: "clamp(0.35rem, 0.9vw, 1rem)",
            maxWidth: `min(100%, calc(${count} * 10rem + ${count - 1} * 1rem))`,
            paddingInline: "clamp(2.75rem, 5vw, 4.5rem)",
          }}
        >
          {players.map((player) => (
            <HeroPlayerCard
              key={player.id}
              player={player}
              game={game}
              isMvp={isMvpPlayer(player, data)}
              theme="gold"
            />
          ))}
        </ul>
      ) : (
        <Link
          href={`/esports/tournaments/${tournamentSlug}`}
          className="relative z-10 mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45 transition-colors hover:text-white/75"
        >
          View cup
          <span aria-hidden> →</span>
        </Link>
      )}
    </div>
  );
}
