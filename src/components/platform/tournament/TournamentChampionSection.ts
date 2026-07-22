import { createElement as h } from "react";
import type { GameSlug } from "@prisma/client";
import type { TournamentTeamPlayerView } from "@core/contracts";
import type { ChampionResult } from "@/lib/tournament-champion";

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

function TrophyIcon({ className }: { className?: string }) {
  return h(
    "svg",
    { className, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true },
    h("path", {
      d: "M7 4V2h10v2h3a1 1 0 0 1 1 1v2a5 5 0 0 1-4.1 4.9A5.002 5.002 0 0 1 13 17.9V19h3v2H8v-2h3v-1.1A5.002 5.002 0 0 1 7.1 11.9 5 5 0 0 1 3 7V5a1 1 0 0 1 1-1h3zm0 2H5v1a3 3 0 0 0 3 3V6H7zm10 0h-3v4a3 3 0 0 0 3-3V6z",
    }),
  );
}

type Props = {
  championData: ChampionResult;
  game?: GameSlug;
  accentHex?: string;
};

export default function TournamentChampionSection({ championData, game }: Props) {
  const { championTeam, runnerUpTeam, matchScore } = championData;
  const isFifa = game === "EA_FC26";
  const players = championTeam.players ?? [];

  return h(
    "section",
    {
      className:
        "relative overflow-hidden rounded-[1.75rem] border border-amber-400/45 bg-gradient-to-br from-[#12141a] via-[#0a0c10] to-[#0d1016] p-5 shadow-[0_0_70px_rgba(245,158,11,0.18)] sm:p-8",
    },
    h("div", {
      className:
        "pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl",
    }),
    h("div", {
      className:
        "pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-emerald-500/8 blur-3xl",
    }),
    h(
      "div",
      {
        className:
          "relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5",
      },
      h(
        "div",
        { className: "flex items-center gap-3" },
        h(
          "div",
          {
            className:
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-black/40 text-amber-300",
          },
          h(TrophyIcon, { className: "h-5 w-5" }),
        ),
        h(
          "div",
          null,
          h(
            "p",
            {
              className:
                "text-[11px] font-black uppercase tracking-[0.22em] text-amber-300",
            },
            "Winners - Grand Champions",
          ),
          h(
            "p",
            { className: "mt-0.5 text-xs text-white/45" },
            "Tournament Champions Declared",
          ),
        ),
      ),
      matchScore
        ? h(
            "span",
            {
              className:
                "inline-flex items-center rounded-full border border-amber-400/40 bg-black/35 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90",
            },
            `Final Score: ${matchScore}`,
          )
        : null,
    ),
    h(
      "div",
      {
        className:
          "relative z-10 flex flex-wrap items-center gap-5 border-b border-white/[0.08] py-6",
      },
      championTeam.logoUrl
        ? h("img", {
            src: championTeam.logoUrl,
            alt: championTeam.name,
            className:
              "h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-amber-400/50",
          })
        : h(
            "div",
            {
              className:
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/25 via-violet-500/15 to-amber-700/20 text-amber-300 ring-1 ring-amber-400/45",
            },
            h(TrophyIcon, { className: "h-8 w-8" }),
          ),
      h(
        "div",
        { className: "min-w-0" },
        h(
          "div",
          {
            className:
              "mb-1.5 inline-flex items-center rounded-md bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-black",
          },
          "1st Place - Champions",
        ),
        h(
          "h2",
          {
            className:
              "font-display text-2xl font-black uppercase tracking-tight text-white sm:text-3xl md:text-4xl",
          },
          championTeam.name,
        ),
        runnerUpTeam
          ? h(
              "p",
              { className: "mt-1.5 text-sm text-white/50" },
              "Runner Up: ",
              h(
                "span",
                { className: "font-semibold text-white/75" },
                runnerUpTeam.name,
              ),
            )
          : null,
      ),
    ),
    h(
      "div",
      { className: "relative z-10 pt-6" },
      h(
        "p",
        {
          className:
            "mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-300/90",
        },
        h(
          "svg",
          {
            className: "h-3.5 w-3.5 text-amber-400",
            fill: "currentColor",
            viewBox: "0 0 24 24",
            "aria-hidden": true,
          },
          h("path", {
            d: "M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z",
          }),
        ),
        `Champion Roster - ${players.length} ${players.length === 1 ? "Player" : "Players"}`,
      ),
      players.length > 0
        ? h(
            "ul",
            { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" },
            ...sortByRole(players).map((player) => {
              const role = player.participantRole ?? "PLAYER";
              const badge = ROLE_BADGE[role] ?? ROLE_BADGE.PLAYER!;
              const secondary = isFifa ? player.olympusId : player.riotId;
              return h(
                "li",
                {
                  key: player.id,
                  className:
                    "flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/35 px-4 py-3.5",
                },
                h(
                  "div",
                  { className: "min-w-0" },
                  h(
                    "p",
                    {
                      className:
                        "truncate font-display text-[15px] font-bold text-white",
                    },
                    player.displayName,
                  ),
                  secondary
                    ? h(
                        "p",
                        { className: "mt-0.5 truncate text-xs text-white/45" },
                        secondary,
                      )
                    : null,
                ),
                h(
                  "span",
                  {
                    className:
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                    style: {
                      background: `${badge.color}20`,
                      color: badge.color,
                      boxShadow: `inset 0 0 0 1px ${badge.color}50`,
                    },
                  },
                  badge.label,
                ),
              );
            }),
          )
        : h(
            "p",
            { className: "text-xs italic text-white/40" },
            "Champion roster will appear when the winning team is linked in the cup.",
          ),
    ),
  );
}
