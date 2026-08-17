"use client";

import { useState, type ReactNode } from "react";
import type { TournamentTeamView } from "@core/contracts";
import { resolvePortraitCardArtUrl } from "@/lib/valorant-player-card";
import type { RolePlayerStat } from "@/lib/valorant-role-leaders";
import ValorantRoleIcon from "@/components/icons/ValorantRoleIcon";

export type { RolePlayerStat };

const DEFAULT_VAL_CARD =
  "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png";

const MOBILE_BADGES: Record<string, string> = {
  overall: "MVP",
  duelist: "#1 DUELIST",
  initiator: "#1 INITIATOR",
  controller: "#1 CONTROLLER",
  sentinel: "#1 SENTINEL",
  flex: "#1 FLEX",
};

export const DEFAULT_ROLE_PLAYERS: RolePlayerStat[] = [
  {
    roleKey: "duelist",
    roleTitle: "#1 Duelist",
    roleBadgeText: "#1 DUELIST",
    displayName: "Conor McGregor",
    riotTag: "Tony",
    subtitle: "Conor_McGregor",
    statLabel: "FIRST KILLS",
    statValue: "34",
    cardArtUrl:
      "https://media.valorant-api.com/playercards/c8b2f5fd-4331-b172-f3b7-c8a26f356a1f/largeart.png",
  },
  {
    roleKey: "initiator",
    roleTitle: "#1 Initiator",
    roleBadgeText: "#1 INITIATOR",
    displayName: "SaMサム",
    riotTag: "1109",
    subtitle: "Samarth",
    statLabel: "ASSISTS",
    statValue: "52",
    cardArtUrl:
      "https://media.valorant-api.com/playercards/eef542d2-4724-bc47-f53f-239f8c9c2623/largeart.png",
  },
  {
    roleKey: "controller",
    roleTitle: "#1 Controller",
    roleBadgeText: "#1 CONTROLLER",
    displayName: "Pwnsta",
    riotTag: "BLING",
    subtitle: "Pwnsta",
    statLabel: "KAST",
    statValue: "79.2%",
    cardArtUrl:
      "https://media.valorant-api.com/playercards/d32e58b1-4191-7315-ad4a-9da58b3f23dd/largeart.png",
  },
  {
    roleKey: "sentinel",
    roleTitle: "#1 Sentinel",
    roleBadgeText: "#1 SENTINEL",
    displayName: "valorant hater",
    riotTag: "IGL",
    subtitle: "Shanks",
    statLabel: "KAST",
    statValue: "81.5%",
    cardArtUrl:
      "https://media.valorant-api.com/playercards/d2d3caf9-499f-2ac8-9722-54961c3bcbf5/largeart.png",
  },
  {
    roleKey: "flex",
    roleTitle: "#1 Flex",
    roleBadgeText: "#1 FLEX",
    displayName: "ValkoN 炎",
    riotTag: "vibhu",
    subtitle: "Vibhu",
    statLabel: "ACS",
    statValue: "248",
    cardArtUrl:
      "https://media.valorant-api.com/playercards/1711d20d-4b1c-c64a-14be-d4ae58a457c6/largeart.png",
  },
];

type GlassThemeConfig = {
  cardBorder: string;
  glowWash: string;
  badgeStyle: string;
  statBadgeStyle: string;
  statColor: string;
  hairline: string;
  icon: ReactNode;
};

const GLASS_THEMES: Record<string, GlassThemeConfig> = {
  overall: {
    cardBorder:
      "border-amber-400/40 hover:border-amber-300/80 shadow-[0_8px_30px_rgba(245,158,11,0.15)]",
    glowWash: "from-amber-500/15 via-amber-300/5 to-transparent",
    badgeStyle:
      "bg-[#0a0c14]/90 text-amber-300 border-amber-400/50 shadow-md ring-1 ring-amber-400/20",
    statBadgeStyle:
      "bg-transparent border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    statColor: "text-amber-300",
    hairline: "bg-gradient-to-r from-transparent via-amber-300/70 to-transparent",
    icon: (
      <svg className="h-2.5 w-2.5 fill-amber-300 shrink-0" viewBox="0 0 24 24">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
      </svg>
    ),
  },
  duelist: {
    cardBorder:
      "border-rose-500/40 hover:border-rose-400/80 shadow-[0_8px_30px_rgba(244,63,94,0.15)]",
    glowWash: "from-rose-500/15 via-rose-300/5 to-transparent",
    badgeStyle:
      "bg-[#0a0c14]/90 text-rose-300 border-rose-400/50 shadow-md ring-1 ring-rose-400/20",
    statBadgeStyle:
      "bg-transparent border-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.2)]",
    statColor: "text-rose-300",
    hairline: "bg-gradient-to-r from-transparent via-rose-300/70 to-transparent",
    icon: <ValorantRoleIcon role="duelist" className="h-2.5 w-2.5 shrink-0" />,
  },
  initiator: {
    cardBorder:
      "border-sky-400/40 hover:border-sky-300/80 shadow-[0_8px_30px_rgba(56,189,248,0.15)]",
    glowWash: "from-sky-500/15 via-sky-300/5 to-transparent",
    badgeStyle:
      "bg-[#0a0c14]/90 text-sky-300 border-sky-400/50 shadow-md ring-1 ring-sky-400/20",
    statBadgeStyle:
      "bg-transparent border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.2)]",
    statColor: "text-sky-300",
    hairline: "bg-gradient-to-r from-transparent via-sky-300/70 to-transparent",
    icon: <ValorantRoleIcon role="initiator" className="h-2.5 w-2.5 shrink-0" />,
  },
  controller: {
    cardBorder:
      "border-purple-400/40 hover:border-purple-300/80 shadow-[0_8px_30px_rgba(168,85,247,0.15)]",
    glowWash: "from-purple-500/15 via-purple-300/5 to-transparent",
    badgeStyle:
      "bg-[#0a0c14]/90 text-purple-300 border-purple-400/50 shadow-md ring-1 ring-purple-400/20",
    statBadgeStyle:
      "bg-transparent border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]",
    statColor: "text-purple-300",
    hairline: "bg-gradient-to-r from-transparent via-purple-300/70 to-transparent",
    icon: <ValorantRoleIcon role="controller" className="h-2.5 w-2.5 shrink-0" />,
  },
  sentinel: {
    cardBorder:
      "border-emerald-400/40 hover:border-emerald-300/80 shadow-[0_8px_30px_rgba(16,185,129,0.15)]",
    glowWash: "from-emerald-500/15 via-emerald-300/5 to-transparent",
    badgeStyle:
      "bg-[#0a0c14]/90 text-emerald-300 border-emerald-400/50 shadow-md ring-1 ring-emerald-400/20",
    statBadgeStyle:
      "bg-transparent border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
    statColor: "text-emerald-300",
    hairline: "bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent",
    icon: <ValorantRoleIcon role="sentinel" className="h-2.5 w-2.5 shrink-0" />,
  },
  flex: {
    cardBorder:
      "border-indigo-400/40 hover:border-indigo-300/80 shadow-[0_8px_30px_rgba(99,102,241,0.15)]",
    glowWash: "from-indigo-500/15 via-indigo-300/5 to-transparent",
    badgeStyle:
      "bg-[#0a0c14]/90 text-indigo-300 border-indigo-400/50 shadow-md ring-1 ring-indigo-400/20",
    statBadgeStyle:
      "bg-transparent border-indigo-400/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]",
    statColor: "text-indigo-300",
    hairline: "bg-gradient-to-r from-transparent via-indigo-300/70 to-transparent",
    icon: <ValorantRoleIcon role="flex" className="h-2.5 w-2.5 shrink-0" />,
  },
};

function resolvePlayerCardFromTeams(
  stat: RolePlayerStat,
  allTeams: TournamentTeamView[] = []
): string {
  if (stat.riotPlayerCard || stat.riotPlayerCardWide) {
    const res = resolvePortraitCardArtUrl(stat.riotPlayerCard, stat.riotPlayerCardWide);
    if (res) return res;
  }

  const norm = (s?: string | null) => (s ? s.toLowerCase().trim() : "");
  const targetName = norm(stat.displayName);

  for (const team of allTeams) {
    for (const p of team.players ?? []) {
      const pName = norm(p.displayName);
      const pRiot = norm(p.riotId);
      if (
        (stat.userId && p.userId === stat.userId) ||
        (targetName && pName === targetName) ||
        (targetName && pRiot.includes(targetName))
      ) {
        const res = resolvePortraitCardArtUrl(p.riotPlayerCard, p.riotPlayerCardWide);
        if (res) return res;
      }
    }
  }

  if (stat.cardArtUrl) {
    const res = resolvePortraitCardArtUrl(stat.cardArtUrl);
    if (res) return res;
    return stat.cardArtUrl;
  }

  return DEFAULT_VAL_CARD;
}

function getRoleStatData(player: RolePlayerStat): {
  value: string;
  label: string;
  mobileLabel: string;
} {
  if (player.statValue === undefined || player.statValue === null) {
    return { value: "-", label: "STAT", mobileLabel: "STAT" };
  }
  const val = String(player.statValue);
  const lbl = (player.statLabel ?? "STAT").toUpperCase();
  let mobLbl = lbl;
  if (lbl.includes("FIRST")) mobLbl = "FK";
  if (lbl.includes("ASSIST")) mobLbl = "AST";
  return { value: val, label: lbl, mobileLabel: mobLbl };
}

/** Portrait crystal glass card — used on mobile (3+2) and desktop (5-col) */
function CrystalGlassPlayerCard({
  player,
  allTeams,
}: {
  player: RolePlayerStat;
  allTeams: TournamentTeamView[];
}) {
  const theme = GLASS_THEMES[player.roleKey] ?? GLASS_THEMES.duelist;
  const cardArtSrc = resolvePlayerCardFromTeams(player, allTeams);
  const statData = getRoleStatData(player);

  // Subtle 3D tilt mouse interaction (desktop)
  const [tilt, setTilt] = useState({ rotX: 0, rotY: 0, active: false });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 8;
    const rotY = ((x - centerX) / centerX) * 8;

    setTilt({ rotX, rotY, active: true });
  };

  const handleMouseLeave = () => {
    setTilt({ rotX: 0, rotY: 0, active: false });
  };

  return (
    <div
      style={{ perspective: "800px" }}
      className="group relative mx-auto h-[168px] w-full sm:h-auto sm:aspect-[268/640]"
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
        className={`relative h-full w-full overflow-hidden rounded-lg border bg-[#080b12] transition-all duration-300 sm:rounded-2xl sm:border-2 ${theme.cardBorder}`}
      >
        <img
          src={cardArtSrc}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_VAL_CARD;
          }}
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />

        <div className="pointer-events-none absolute inset-0 z-15 bg-gradient-to-tr from-white/[0.03] via-transparent to-white/[0.08]" />

        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black from-[22%] via-black/75 via-[48%] to-transparent to-[80%]" />

        <div
          className={`pointer-events-none absolute inset-0 z-20 bg-gradient-to-tr opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${theme.glowWash}`}
        />

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

        {/* Role badge — sized to fit full "#1 …" label without ellipsis */}
        <div className="absolute inset-x-0.5 top-1 z-30 flex justify-center sm:inset-x-1 sm:top-2.5">
          <span
            className={`inline-flex max-w-full items-center justify-center gap-0.5 whitespace-nowrap rounded-full px-1 py-0.5 text-[5.5px] font-black uppercase tracking-tighter backdrop-blur-md sm:gap-1 sm:px-2 sm:py-1 sm:text-[8px] sm:tracking-[0.06em] sm:transition-transform sm:duration-300 sm:group-hover:scale-105 ${theme.badgeStyle}`}
          >
            <span className="hidden shrink-0 sm:inline-flex">{theme.icon}</span>
            <span>
              {MOBILE_BADGES[player.roleKey] ?? player.roleBadgeText}
            </span>
          </span>
        </div>

        <div
          style={{ transform: "translateZ(18px)" }}
          className="relative z-20 flex h-full flex-col items-center justify-end px-0.5 pb-1.5 pt-5 text-center sm:px-3 sm:pb-4 sm:pt-14"
        >
          <div className={`mb-0.5 h-px w-3.5 sm:mb-2.5 sm:w-12 ${theme.hairline}`} />

          <h3 className="max-w-full truncate font-display text-[9px] font-black leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] transition-colors duration-300 group-hover:text-amber-100 sm:text-lg sm:tracking-[0.02em]">
            {player.displayName}
          </h3>

          <div className="mt-1 flex items-center justify-center sm:mt-2">
            <div
              className={`inline-flex items-center gap-0.5 rounded-full border bg-transparent px-1 py-0.5 text-[7px] font-black backdrop-blur-md sm:gap-1 sm:px-3 sm:py-1 sm:text-[9.5px] ${theme.statBadgeStyle}`}
            >
              <span className={`font-black ${theme.statColor}`}>{statData.value}</span>
              <span className="text-[6px] font-bold uppercase tracking-wider text-white/70 sm:text-[8px]">
                <span className="sm:hidden">{statData.mobileLabel}</span>
                <span className="hidden sm:inline">{statData.label}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  players?: RolePlayerStat[];
  allTeams?: TournamentTeamView[];
};

export default function TournamentBestPlayersByRole({
  players = [],
  allTeams = [],
}: Props) {
  // Filter out 'overall' MVP if present so this section strictly shows the 5 Role Leaders
  const roleLeaders = players.filter((p) => p.roleKey !== "overall");
  if (roleLeaders.length === 0) return null;

  return (
    <section className="relative isolate min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#06080f]/95 p-2.5 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.9)] sm:rounded-[2.5rem] sm:p-8 lg:p-10">
      {/* Background Ambient Lighting */}
      <div className="pointer-events-none absolute -left-[15%] -top-[35%] h-[70%] w-[55%] rounded-full bg-amber-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute -right-[15%] -bottom-[35%] h-[70%] w-[55%] rounded-full bg-purple-600/5 blur-[120px]" />

      {/* Section Header */}
      <div className="relative z-10 flex items-center justify-center pb-2 sm:pb-6">
        <h2 className="font-display text-[10px] font-black uppercase tracking-[0.16em] text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-white to-amber-200/80 sm:text-xl sm:tracking-[0.2em] md:text-2xl">
          THE ROLE LEADERS
        </h2>
      </div>

      {/* Single row — readable on phone, full portraits from sm+ */}
      <div
        className={`relative z-10 grid gap-1.5 sm:gap-4 lg:gap-5 ${
          roleLeaders.length >= 5
            ? "grid-cols-5"
            : roleLeaders.length === 4
              ? "grid-cols-4"
              : roleLeaders.length === 3
                ? "grid-cols-3"
                : "grid-cols-2"
        }`}
      >
        {roleLeaders.map((player) => (
          <CrystalGlassPlayerCard
            key={player.roleKey}
            player={player}
            allTeams={allTeams}
          />
        ))}
      </div>
    </section>
  );
}
