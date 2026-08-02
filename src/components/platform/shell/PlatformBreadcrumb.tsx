"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Crumb = { label: string; href?: string };

const SEGMENT_LABELS: Record<string, string> = {
  tournaments: "Tournaments",
  roster: "Roster",
  leaderboard: "Leaderboards",
  profile: "Profile",
  login: "Login",
  signup: "Join",
  admin: "Admin",
  listings: "Listings",
};

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((w) => w.toUpperCase())
    .join(" ");
}

export function crumbsFromPath(pathname: string): Crumb[] {
  if (pathname === "/profile") return [{ label: "Profile" }];
  if (pathname === "/login" || pathname === "/signup") {
    return [{ label: SEGMENT_LABELS[pathname.slice(1)] ?? "Account" }];
  }

  if (pathname === "/listings") {
    return [{ label: "Listings" }];
  }

  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];

  if (parts[0] === "listings" && parts[1]) {
    crumbs.push({ label: "Listings", href: "/listings" });
    crumbs.push({ label: titleFromSlug(parts[1]) });
    return crumbs;
  }

  if (parts[0] === "esports") {
    if (parts[1] === "tournaments") {
      crumbs.push({ label: "Tournaments", href: parts[2] ? "/esports/tournaments" : undefined });
      if (parts[2]) crumbs.push({ label: titleFromSlug(parts[2]) });
    } else if (parts[1] === "leaderboard") {
      crumbs.push({ label: "Leaderboards" });
    } else if (parts[1] === "roster") {
      crumbs.push({ label: "Roster" });
    }
  }

  return crumbs;
}

export default function PlatformBreadcrumb() {
  const pathname = usePathname();
  const crumbs = crumbsFromPath(pathname);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
      <Link href="/" className="text-white/35 transition-colors hover:text-white/60">
        Lounge
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="flex items-center gap-2">
          <span className="text-white/20">/</span>
          {crumb.href ? (
            <Link href={crumb.href} className="text-white/45 transition-colors hover:text-white/75">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-white/70">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
