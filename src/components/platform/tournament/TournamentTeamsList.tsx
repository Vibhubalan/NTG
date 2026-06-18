"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameSlug } from "@prisma/client";
import type { TournamentTeamView } from "@core/contracts";

type Props = {
  teams: string[];
  teamDetails?: TournamentTeamView[];
  accentHex?: string;
  game?: GameSlug;
};

function TeamPreviewScreen({
  team,
  accentHex,
  onClose,
}: {
  team: TournamentTeamView;
  accentHex: string;
  onClose: () => void;
}) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0A0A0A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-6">
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

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.28em] text-white/35">
          Squad · {team.players.length} players
        </p>

        <ul className="mx-auto max-w-lg space-y-3">
          {team.players.map((player) => (
            <li
              key={player.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-base font-semibold text-white">{player.displayName}</p>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: `${accentHex}18`,
                    color: accentHex,
                    boxShadow: `inset 0 0 0 1px ${accentHex}33`,
                  }}
                >
                  {player.participantRole === "CAPTAIN" ? "Captain" : "Player"}
                </span>
              </div>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/40">Olympus ID</dt>
                  <dd className="text-right text-white/85">{player.olympusId ?? "—"}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
  );
}

export default function TournamentTeamsList({
  teams,
  teamDetails = [],
  accentHex = "#7c3aed",
  game,
}: Props) {
  const [previewTeam, setPreviewTeam] = useState<TournamentTeamView | null>(null);

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

  const isFifa = game === "EA_FC26";

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-cyan-400" />
        <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-white">
          Teams
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-cyan-400 to-transparent opacity-30" />
      </div>

      {rows.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((team, index) => {
            const hasPlayers = team.players.length > 0;
            const canPreview = isFifa && hasPlayers;

            return (
              <li key={team.id}>
                <button
                  type="button"
                  onClick={() => canPreview && setPreviewTeam(team)}
                  disabled={!canPreview && isFifa}
                  className={`flex w-full items-center gap-4 rounded-[1.15rem] border border-white/[0.06] bg-[#0A0A0A]/70 px-5 py-4 text-left backdrop-blur-sm transition-colors ${
                    canPreview
                      ? "cursor-pointer hover:border-white/[0.12] hover:bg-[#0A0A0A]/85 active:scale-[0.99]"
                      : "cursor-default"
                  }`}
                >
                  {team.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.logoUrl}
                      alt=""
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
                    <span className="font-display text-lg font-semibold tracking-[-0.01em] text-white/90">
                      {team.name}
                    </span>
                    {hasPlayers && !isFifa ? (
                      <p className="mt-0.5 truncate text-xs text-white/40">
                        {team.players.map((p) => p.displayName).join(" · ")}
                      </p>
                    ) : hasPlayers && isFifa ? (
                      <p className="mt-0.5 text-xs text-white/40">
                        {team.players.length} players
                      </p>
                    ) : null}
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
      ) : (
        <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
          <p className="text-sm text-white/45">
            Teams will appear here once players register.
          </p>
        </div>
      )}

      {previewTeam ? (
        <TeamPreviewScreen
          team={previewTeam}
          accentHex={accentHex}
          onClose={() => setPreviewTeam(null)}
        />
      ) : null}
    </section>
  );
}
