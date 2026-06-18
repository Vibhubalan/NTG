"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const marketingLinks = [
  { label: "Arena", href: "#arena" },
  { label: "Games", href: "#games" },
  { label: "Trophies", href: "#vault" },
  { label: "Esports", href: "/esports" },
  { label: "Visit", href: "#visit" },
];

const platformLinks = [
  { label: "Lounge", href: "/" },
  { label: "Cups", href: "/esports/tournaments" },
  { label: "Rankings", href: "/esports/leaderboard" },
  { label: "Moments", href: "/gallery" },
];

function isPlatformRoute(path: string) {
  const roots = ["/esports", "/gallery", "/profile", "/admin"];
  return roots.some((r) => path === r || path.startsWith(`${r}/`));
}

function NavLink({
  href,
  label,
  active,
  external,
}: {
  href: string;
  label: string;
  active?: boolean;
  external?: boolean;
}) {
  const isEsports = label.toLowerCase() === "esports";
  const isLounge = label.toLowerCase() === "lounge";
  
  let textColorClass = active ? "text-white" : "text-white/60 hover:text-white";
  let spanClass = "relative z-10";

  if (isEsports || isLounge) {
    textColorClass = active ? "" : "opacity-75 hover:opacity-100 transition-opacity";
    const gradient = isEsports 
      ? "from-[var(--color-iris)] to-[var(--color-brand)]"
      : "from-emerald-400 to-cyan-400";
    const shadow = isEsports
      ? "drop-shadow-[0_0_8px_rgba(124,58,237,0.3)]"
      : "drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]";

    spanClass = `relative z-10 bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold ${
      active ? shadow : ""
    }`;
  }

  const className = `group relative rounded-full px-4 py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors sm:px-5 sm:py-2.5 sm:text-[13px] sm:tracking-[0.18em] ${textColorClass}`;

  const underline = !active && (
    <span className="absolute inset-x-3 bottom-1.5 h-px origin-left scale-x-0 bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-iris)] transition-transform duration-300 group-hover:scale-x-100 sm:inset-x-4" />
  );

  if (external) {
    return (
      <a href={href} className={className}>
        <span className={spanClass}>{label}</span>
        {underline}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <span className={spanClass}>{label}</span>
      {underline}
    </Link>
  );
}

function isAuthRoute(path: string) {
  return path === "/login" || path === "/signup";
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function AuthNavAction({
  signedIn,
  displayName,
  isAdmin,
}: {
  signedIn: boolean;
  displayName: string;
  isAdmin: boolean;
}) {
  if (!signedIn) {
    return (
      <Link
        href="/signup"
        className="cta rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] transition-all hover:scale-[1.03] hover:brightness-110 sm:px-5 sm:py-2.5 sm:text-[13px]"
      >
        Join
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin ? (
        <Link
          href="/admin"
          className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200"
        >
          Admin
        </Link>
      ) : null}
      <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-3.5 pr-1">
      <Link
        href="/profile"
        className="max-w-[100px] truncate text-[12px] font-medium tracking-[0.02em] text-white/85 transition-colors hover:text-white sm:max-w-[140px] sm:text-[13px]"
        title={displayName}
      >
        {displayName}
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        aria-label="Sign out"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-300"
      >
        <LogOutIcon className="h-4 w-4" />
      </button>
      </div>
    </div>
  );
}

function MobileNavRow({
  links,
  pathname,
  platform,
}: {
  links: typeof marketingLinks;
  pathname: string;
  platform: boolean;
}) {
  return (
    <ul className="mt-2.5 flex items-stretch gap-1 overflow-x-auto border-t border-white/[0.06] pt-2.5 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
      {links.map((link) => {
        const active = platform
          ? pathname === link.href || pathname.startsWith(`${link.href}/`)
          : link.href === "/esports"
            ? pathname.startsWith("/esports")
            : false;

        const isEsports = link.label.toLowerCase() === "esports";
        const isLounge = link.label.toLowerCase() === "lounge";

        let className =
          "flex w-full min-w-[4.25rem] shrink-0 items-center justify-center rounded-full px-2 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ";

        if (active) {
          className += "bg-white/10 font-semibold text-white";
        } else if (isEsports) {
          className += "text-violet-300/90";
        } else if (isLounge) {
          className += "text-emerald-300/90";
        } else {
          className += "text-white/55";
        }

        const label = link.label;

        if (!platform && link.href.startsWith("#")) {
          return (
            <li key={link.href} className="flex flex-1">
              <a href={link.href} className={className}>
                {label}
              </a>
            </li>
          );
        }

        return (
          <li key={link.href} className="flex flex-1">
            <Link href={link.href} className={className}>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NavbarContent() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setIsAdmin(false);
      return;
    }
    fetch("/api/admin/me")
      .then((r) => setIsAdmin(r.ok))
      .catch(() => setIsAdmin(false));
  }, [status, session?.user?.id]);

  if (isAuthRoute(pathname)) return null;

  const signedIn = status === "authenticated" && session?.user;
  const platform = isPlatformRoute(pathname);
  const logoHref = platform ? "/esports" : "/";
  const links = platform ? platformLinks : marketingLinks;

  return (
    <header
      data-site-nav
      className="site-nav flex justify-center px-4 pt-4"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        width: "100%",
        pointerEvents: "none",
      }}
    >
      <nav
        className="glass pointer-events-auto w-full max-w-7xl rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3"
        style={{ transform: "translateZ(0)" }}
      >
        <div className="flex items-center justify-between gap-4">
          <Link href={logoHref} className="flex shrink-0 items-center gap-3" aria-label="NTG Lounge">
            <Image
              src="/ntg-logo.png"
              alt="NTG Lounge"
              width={44}
              height={44}
              priority
              className="h-10 w-10 rounded-xl object-cover drop-shadow-[0_0_12px_rgba(94,234,212,0.55)] sm:h-11 sm:w-11"
            />
            <span className="font-display text-[13px] font-semibold tracking-[0.14em] text-white/95 sm:text-[15px] sm:tracking-[0.18em]">
              NTG{" "}
              <span className={platform ? "bg-gradient-to-r from-[var(--color-iris)] to-[var(--color-brand)] bg-clip-text text-transparent" : "text-[var(--color-brand)]"}>
                {platform ? "ESPORTS" : "LOUNGE"}
              </span>
            </span>
          </Link>

          <ul className="hidden items-center gap-0.5 md:flex">
            {links.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  label={link.label}
                  active={
                    platform
                      ? pathname === link.href || pathname.startsWith(`${link.href}/`)
                      : link.href === "/esports"
                        ? pathname.startsWith("/esports")
                        : false
                  }
                  external={!platform && link.href.startsWith("#")}
                />
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {status === "loading" ? (
              <span
                className="h-9 w-[4.5rem] rounded-full bg-white/[0.06] sm:w-20"
                aria-hidden
              />
            ) : (
              <AuthNavAction
                signedIn={!!signedIn}
                displayName={session?.user?.name?.trim() || "Player"}
                isAdmin={isAdmin}
              />
            )}
          </div>
        </div>

        <MobileNavRow links={links} pathname={pathname} platform={platform} />
      </nav>
    </header>
  );
}

export default function Navbar() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
      if (!isPlatformRoute(window.location.pathname)) {
        window.scrollTo(0, 0);
      }
    }
  }, []);

  if (!mounted) return null;

  return createPortal(<NavbarContent />, document.body);
}
