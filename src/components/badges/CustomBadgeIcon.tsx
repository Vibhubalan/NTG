/** Clean geometric logos for custom player badges. */

import type { ReactNode } from "react";
import ValorantRoleIcon from "@/components/icons/ValorantRoleIcon";
import { resolveValorantRoleKey } from "@/lib/valorant-role-icons";

type Props = {
  iconKey: string;
  className?: string;
  accent?: string;
  /** Pass through to role marks (e.g. disable Flex upscale on leaderboards). */
  boostFlex?: boolean;
};

function SvgShell({
  className,
  accent,
  children,
}: {
  className?: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className ?? "h-4 w-4"}
      fill="none"
      aria-hidden
    >
      <circle cx="16" cy="16" r="15" stroke={accent} strokeOpacity="0.35" strokeWidth="1.5" />
      <g stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

export default function CustomBadgeIcon({
  iconKey,
  className,
  accent = "#a78bfa",
  boostFlex = true,
}: Props) {
  // Role awards use the official Valorant role marks.
  if (resolveValorantRoleKey(iconKey)) {
    return (
      <ValorantRoleIcon
        role={iconKey}
        className={className ?? "h-4 w-4"}
        boostFlex={boostFlex}
      />
    );
  }

  switch (iconKey) {
    case "best_igl":
      return (
        <SvgShell className={className} accent={accent}>
          <circle cx="16" cy="12" r="3.2" />
          <path d="M10 23 C11 19.5 13.2 18 16 18 C18.8 18 21 19.5 22 23" />
          <path d="M22 9 L24.5 10.2 L23.8 13" />
        </SvgShell>
      );
    case "clutch_king":      return (
        <SvgShell className={className} accent={accent}>
          <path d="M10 13 H22 V16 C22 19.5 19.5 22 16 22 C12.5 22 10 19.5 10 16 Z" />
          <path d="M12 13 V11 C12 9.5 13.5 8.5 16 8.5 C18.5 8.5 20 9.5 20 11 V13" />
          <path d="M14 25 H18" />
        </SvgShell>
      );
    case "entry_fragger":
      return (
        <SvgShell className={className} accent={accent}>
          <path d="M8 16 H20" />
          <path d="M16 10 L22 16 L16 22" />
        </SvgShell>
      );
    case "support_star":
      return (
        <SvgShell className={className} accent={accent}>
          <path d="M16 8 L17.8 13.2 H23.2 L18.9 16.4 L20.6 21.6 L16 18.6 L11.4 21.6 L13.1 16.4 L8.8 13.2 H14.2 Z" />
        </SvgShell>
      );
    case "lurk_lord":
      return (
        <SvgShell className={className} accent={accent}>
          <path d="M7 16 C10 11 13 9 16 9 C19 9 22 11 25 16 C22 21 19 23 16 23 C13 23 10 21 7 16 Z" />
          <circle cx="16" cy="16" r="2.4" fill={accent} stroke="none" />
        </SvgShell>
      );
    case "ace_machine":
      return (
        <SvgShell className={className} accent={accent}>
          <path d="M16 7 L18 13 H24 L19.5 16.5 L21.5 23 L16 19.5 L10.5 23 L12.5 16.5 L8 13 H14 Z" />
        </SvgShell>
      );
    default:
      return (
        <SvgShell className={className} accent={accent}>
          <circle cx="16" cy="16" r="4" />
        </SvgShell>
      );
  }
}
