"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { GameSlug } from "@prisma/client";
import type { TournamentTeamView, TournamentTeamPlayerView } from "@core/contracts";

type Props = {
  teams: string[];
  teamDetails?: TournamentTeamView[];
  soloPlayers?: TournamentTeamPlayerView[];
  accentHex?: string;
  game?: GameSlug;
  registrationFormat?: string | null;
};

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  CAPTAIN: { label: "Captain", color: "#f6c177" },
  CO_CAPTAIN: { label: "Co-Captain", color: "#a78bfa" },
  PLAYER: { label: "Player", color: "#5eead4" },
  POACH: { label: "Poached", color: "#fbbf24" },
};

const ROLE_ORDER: Record<string, number> = {
  CAPTAIN: 0,
  CO_CAPTAIN: 1,
  PLAYER: 2,
  POACH: 3,
};

function playerRoleKey(player: TournamentTeamPlayerView): string {
  if (player.membershipKind === "POACH") return "POACH";
  return player.participantRole ?? "PLAYER";
}

function sortByRole(players: TournamentTeamPlayerView[]): TournamentTeamPlayerView[] {
  return [...players].sort(
    (a, b) => (ROLE_ORDER[playerRoleKey(a)] ?? 2) - (ROLE_ORDER[playerRoleKey(b)] ?? 2),
  );
}

function TeamPreviewScreen({
  team,
  game,
  onClose,
}: {
  team: TournamentTeamView;
  game?: GameSlug;
  onClose: () => void;
}) {
  const isFifa = game === "EA_FC26";
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-start justify-center overflow-y-auto bg-black/70 px-3 pb-4 pt-[calc(env(safe-area-inset-top,0px)+5.75rem)] backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0A0A0A] shadow-2xl max-h-[calc(100dvh-env(safe-area-inset-top,0px)-6.5rem)] sm:max-h-[min(85dvh,40rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/75 transition-colors hover:border-white/20 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h3 className="min-w-0 flex-1 truncate font-display text-lg font-bold text-white">{team.name}</h3>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white/35 sm:mb-5">
            Squad · {team.players.length}{" "}
            {team.players.length === 1 ? "player" : "players"}
          </p>

          <ul className="mx-auto max-w-lg space-y-2.5">
            {sortByRole(team.players).map((player) => {
              const role = playerRoleKey(player);
              const badge = ROLE_BADGE[role] ?? ROLE_BADGE.PLAYER;
              const secondary = isFifa ? player.olympusId : player.riotId;
              const isPoach = player.membershipKind === "POACH";
              return (
                <li
                  key={player.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 ${
                    isPoach
                      ? "border-amber-400/20 bg-amber-500/[0.06]"
                      : "border-white/[0.07] bg-white/[0.025]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-[15px] font-semibold text-white">
                      {player.displayName}
                    </p>
                    {isPoach && player.poachedFromTeamName ? (
                      <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-wider text-amber-300/90">
                        Poached: {player.poachedFromTeamName}
                      </p>
                    ) : null}
                    {secondary ? (
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {secondary}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: `${badge.color}1a`,
                      color: badge.color,
                      boxShadow: `inset 0 0 0 1px ${badge.color}40`,
                    }}
                  >
                    {badge.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function teamFooterLabel(team: TournamentTeamView, index: number): string {
  if (team.seed != null) return `Seed #${team.seed}`;
  if (team.players.length > 0) {
    return `${team.players.length} ${team.players.length === 1 ? "player" : "players"}`;
  }
  return `Team #${index + 1}`;
}

function SoloPlayersList({
  players,
  accentHex,
  game,
}: {
  players: TournamentTeamPlayerView[];
  accentHex: string;
  game?: GameSlug;
}) {
  const isFifa = game === "EA_FC26";

  return (
    <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {players.map((player, index) => {
        const secondary = isFifa ? player.olympusId : player.riotId;

        return (
          <li
            key={player.id}
            className="w-[min(calc(50%-0.375rem),11.5rem)] sm:w-40 md:w-44 lg:w-48"
          >
            <div className="flex min-h-full w-full items-center gap-3 rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums text-white"
                style={{
                  background: `${accentHex}18`,
                  boxShadow: `inset 0 0 0 1px ${accentHex}44`,
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  title={player.displayName}
                  className="truncate font-display text-sm font-semibold text-white/90 sm:text-[15px]"
                >
                  {player.displayName}
                </p>
                {secondary ? (
                  <p className="mt-0.5 truncate text-[11px] text-white/40">{secondary}</p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ParticipatingTeamsGrid({
  rows,
  accentHex,
  onPreview,
}: {
  rows: TournamentTeamView[];
  accentHex: string;
  onPreview: (team: TournamentTeamView) => void;
}) {
  return (
    <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {rows.map((team, index) => {
        const hasPlayers = team.players.length > 0;
        const canPreview = hasPlayers;

        return (
          <li
            key={team.id}
            className="w-[min(calc(50%-0.375rem),11.5rem)] sm:w-40 md:w-44 lg:w-48"
          >
            <button
              type="button"
              onClick={() => canPreview && onPreview(team)}
              disabled={!canPreview}
              className={`flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A] text-left transition-colors ${
                canPreview
                  ? "cursor-pointer hover:border-white/20 hover:bg-[#111111] active:scale-[0.995]"
                  : "cursor-default"
              }`}
            >
              <div className="border-b border-white/10 px-3 py-2 text-center">
                <span
                  title={team.name}
                  className="block truncate font-display text-xs font-bold uppercase tracking-wide text-cyan-300 sm:text-sm"
                >
                  {team.name}
                </span>
              </div>

              <div className="relative aspect-square w-full overflow-hidden">
                {team.logoUrl ? (
                  <Image
                    src={team.logoUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black tabular-nums text-white sm:h-16 sm:w-16 sm:text-xl"
                      style={{
                        background: `${accentHex}22`,
                        boxShadow: `inset 0 0 0 2px ${accentHex}55`,
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 px-3 py-2 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/70 sm:text-[11px]">
                  {teamFooterLabel(team, index)}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ClassicTeamsList({
  rows,
  accentHex,
  onPreview,
}: {
  rows: TournamentTeamView[];
  accentHex: string;
  onPreview: (team: TournamentTeamView) => void;
}) {
  return (
    <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
      {rows.map((team, index) => {
        const hasPlayers = team.players.length > 0;
        const canPreview = hasPlayers;
        const captainName = team.players.find((p) => p.participantRole === "CAPTAIN")?.displayName;

        return (
          <li key={team.id} className="min-w-0">
            <button
              type="button"
              onClick={() => canPreview && onPreview(team)}
              disabled={!canPreview}
              className={`flex w-full min-w-0 items-center gap-3 rounded-[1.15rem] border border-white/[0.06] bg-[#0A0A0A]/70 px-4 py-3.5 text-left backdrop-blur-sm transition-colors sm:gap-4 sm:px-5 sm:py-4 ${
                canPreview
                  ? "cursor-pointer hover:border-white/[0.12] hover:bg-[#0A0A0A]/85 active:scale-[0.99]"
                  : "cursor-default"
              }`}
            >
              {team.logoUrl ? (
                <Image
                  src={team.logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black tabular-nums text-white"
                  style={{
                    background: `${accentHex}18`,
                    boxShadow: `inset 0 0 0 1px ${accentHex}44`,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <span
                  title={team.name}
                  className="block truncate font-display text-lg font-semibold tracking-[-0.01em] text-white/90"
                >
                  {team.name}
                </span>
                {hasPlayers ? (
                  <p className="mt-0.5 truncate text-xs text-white/40">
                    {captainName ? <span className="text-white/55">{captainName}</span> : null}
                    {captainName ? " · " : ""}
                    {team.players.length} {team.players.length === 1 ? "player" : "players"}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-white/30">Registration in progress</p>
                )}
              </div>
              {canPreview ? (
                <svg
                  className="h-4 w-4 shrink-0 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function TournamentTeamsList({
  teams,
  teamDetails = [],
  soloPlayers = [],
  accentHex = "#7c3aed",
  game,
  registrationFormat,
}: Props) {
  const [previewTeam, setPreviewTeam] = useState<TournamentTeamView | null>(null);
  const isSoloCup = registrationFormat === "SOLO";

  const rows: TournamentTeamView[] =
    teamDetails.length > 0
      ? teamDetails
      : teams.map((name, index) => ({
          id: `${name}-${index}`,
          name,
          seed: null,
          logoUrl: null,
          players: [],
        }));

  const showLogoGrid = !isSoloCup && rows.some((team) => Boolean(team.logoUrl));
  const sectionTitle = isSoloCup ? "Players" : showLogoGrid ? "Participating Teams" : "Teams";
  const emptyMessage = isSoloCup
    ? "Players will appear here once they register."
    : "Teams will appear here once players register.";

  return (
    <section className="min-w-0">
      <div className="mb-6 flex min-w-0 items-center gap-3">
        <div className="h-px w-6 shrink-0 bg-gradient-to-r from-transparent to-cyan-400 sm:w-8" />
        <h2 className="font-display text-xl font-bold tracking-widest text-white uppercase sm:text-2xl">
          {sectionTitle}
        </h2>
        <div className="h-px min-w-0 flex-1 bg-gradient-to-r from-cyan-400 to-transparent opacity-30" />
      </div>

      {isSoloCup ? (
        soloPlayers.length > 0 ? (
          <SoloPlayersList players={soloPlayers} accentHex={accentHex} game={game} />
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
            <p className="text-sm text-white/45">{emptyMessage}</p>
          </div>
        )
      ) : rows.length > 0 ? (
        showLogoGrid ? (
          <ParticipatingTeamsGrid
            rows={rows}
            accentHex={accentHex}
            onPreview={setPreviewTeam}
          />
        ) : (
          <ClassicTeamsList rows={rows} accentHex={accentHex} onPreview={setPreviewTeam} />
        )
      ) : (
        <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
          <p className="text-sm text-white/45">{emptyMessage}</p>
        </div>
      )}

      {previewTeam ? (
        <TeamPreviewScreen
          team={previewTeam}
          game={game}
          onClose={() => setPreviewTeam(null)}
        />
      ) : null}
    </section>
  );
}
