"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const marketingLinksBase = [
  { label: "Arena", href: "/#arena" },
  { label: "Games", href: "/#games" },
  { label: "Trophies", href: "/#vault" },
  { label: "Esports", href: "/esports" },
  { label: "Visit", href: "/#visit" },
];

const qaNavLink = {
  label: "Q&A",
  href: "/qa",
  badge: "TIME LIMITED",
} as const;

type NavLinkItem = {
  label: string;
  href: string;
  badge?: string;
};

const platformLinksBase = [
  { label: "Lounge", href: "/" },
  { label: "Roster", href: "/esports/roster" },
  { label: "Cups", href: "/esports/tournaments" },
  { label: "Leaderboards", href: "/esports/leaderboard" },
];

function isPlatformRoute(path: string) {
  const roots = ["/esports", "/gallery", "/profile", "/admin", "/listings"];
  return roots.some((r) => path === r || path.startsWith(`${r}/`));
}

function NavLink({
  href,
  label,
  active,
  external,
  badge,
}: {
  href: string;
  label: string;
  active?: boolean;
  external?: boolean;
  badge?: string;
}) {
  const pathname = usePathname();
  const isEsports = label.toLowerCase() === "esports";
  const isLounge = label.toLowerCase() === "lounge";

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (href.startsWith("/#") || href.startsWith("#")) {
      const hash = href.split("#")[1];
      if (pathname === "/") {
        e.preventDefault();
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
          history.pushState(null, "", href);
        }
      }
    }
  };

  let textColorClass = active ? "text-white" : "text-white/60 hover:text-white";
  let textSpanClass = "";
  let containerSpanClass = "relative z-10 flex items-center justify-center gap-1.5";

  if (isEsports || isLounge) {
    textColorClass = active ? "" : "opacity-75 hover:opacity-100 transition-opacity";
    const gradient = isEsports
      ? "from-[var(--color-iris)] to-[var(--color-brand)]"
      : "from-emerald-400 to-cyan-400";
    const shadow = isEsports
      ? "drop-shadow-[0_0_8px_rgba(124,58,237,0.3)]"
      : "drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]";

    textSpanClass = `bg-gradient-to-r ${gradient} bg-clip-text text-transparent font-bold ${active ? shadow : ""
      }`;
  }

  const className = `group relative rounded-full px-4 py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition-colors sm:px-5 sm:py-2.5 sm:text-[13px] sm:tracking-[0.18em] flex items-center ${textColorClass}`;

  const underline = !active && (
    <span className="absolute inset-x-3 bottom-1.5 h-px origin-left scale-x-0 bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-iris)] transition-transform duration-300 group-hover:scale-x-100 sm:inset-x-4" />
  );

  const loungeIcon = isLounge && (
    <svg className="h-[1.2em] w-[1.2em] shrink-0 text-emerald-400 opacity-90 pb-[1px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );

  const badgeEl = badge ? (
    <span className="ml-1.5 rounded-full border border-amber-500/35 bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-amber-200/95">
      {badge}
    </span>
  ) : null;

  if (external) {
    return (
      <a href={href} className={className} onClick={handleClick}>
        <span className={containerSpanClass}>
          {loungeIcon}
          <span className={textSpanClass || undefined}>{label}</span>
          {badgeEl}
        </span>
        {underline}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      <span className={containerSpanClass}>
        {loungeIcon}
        <span className={textSpanClass || undefined}>{label}</span>
        {badgeEl}
      </span>
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

function UserAvatarIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#141820] ring-2 ring-white/15 transition-all group-hover:ring-white/30 group-hover:scale-105">
      <svg
        className="h-[1.35rem] w-[1.35rem] text-white/65"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </span>
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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const joinRef = useRef<HTMLDivElement>(null);
  const callbackUrl = encodeURIComponent(pathname || "/");

  useEffect(() => {
    if (!menuOpen && !joinOpen) return;
    function handleClick(event: MouseEvent) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (joinOpen && joinRef.current && !joinRef.current.contains(event.target as Node)) {
        setJoinOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, joinOpen]);

  if (!signedIn) {
    return (
      <div ref={joinRef} className="relative">
        <button
          type="button"
          onClick={() => setJoinOpen((open) => !open)}
          aria-expanded={joinOpen}
          aria-haspopup="menu"
          className="cta rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] transition-all hover:scale-[1.03] hover:brightness-110 sm:px-5 sm:py-2.5 sm:text-[13px]"
        >
          SIGN IN
        </button>
        {joinOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0a1020]/95 py-1 shadow-xl backdrop-blur-md"
          >
            <Link
              href={`/login?callbackUrl=${callbackUrl}`}
              role="menuitem"
              onClick={() => setJoinOpen(false)}
              className="block px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Log in
            </Link>
            <Link
              href={`/signup?callbackUrl=${callbackUrl}`}
              role="menuitem"
              onClick={() => setJoinOpen(false)}
              className="block px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Sign up
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {isAdmin ? (
        <Link
          href="/admin"
          className="group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-all hover:bg-white/[0.08] hover:border-white/20"
          title="Admin"
          aria-label="Admin"
        >
          <svg className="h-4 w-4 text-white/70 transition-transform duration-500 group-hover:rotate-90 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      ) : null}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Account menu for ${displayName}`}
          title={displayName}
          className="group site-nav-mobile-btn flex h-10 shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] py-0 pl-0.5 pr-1.5 transition-all hover:border-[var(--color-brand)]/35 hover:bg-white/[0.07] sm:pr-2"
        >
          <UserAvatarIcon />
          <ChevronDownIcon open={menuOpen} />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0a1020]/95 py-1 shadow-xl backdrop-blur-md"
          >
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Profile
            </Link>
            <button
              type="button"
              role="menuitem"
              aria-label="Sign out"
              onClick={() => {
                setMenuOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Logout
              <LogOutIcon className="h-3.5 w-3.5 opacity-70" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 text-white/45 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </>
      ) : (
        <>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </>
      )}
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-white/35"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function MobileMenu({
  open,
  onClose,
  links,
  pathname,
  platform,
}: {
  open: boolean;
  onClose: () => void;
  links: NavLinkItem[];
  pathname: string;
  platform: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto border-b border-white/10 bg-[#0a0a0a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/50">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <HamburgerIcon open />
          </button>
        </div>
        <ul className="divide-y divide-white/[0.06] px-2 py-2">
          {links.map((link) => {
            const active = platform
              ? pathname === link.href || pathname.startsWith(`${link.href}/`)
              : link.href === "/esports"
                ? pathname.startsWith("/esports")
                : link.href === "/qa"
                  ? pathname === "/qa"
                  : false;

            const rowClass = `flex w-full items-center justify-between px-4 py-4 text-left text-[13px] font-semibold uppercase tracking-[0.2em] transition-colors ${active ? "text-white" : "text-white/70 hover:text-white"
              }`;

            const isLounge = link.label.toLowerCase() === "lounge";
            const loungeIcon = isLounge && (
              <svg className="inline-block h-[1.1em] w-[1.1em] ml-2 opacity-80 shrink-0 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            );

            const content = (
              <>
                <span className="flex flex-wrap items-center gap-2">
                  <span>
                    {link.label}
                    {loungeIcon}
                  </span>
                  {link.badge ? (
                    <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200/95">
                      {link.badge}
                    </span>
                  ) : null}
                </span>
                <ChevronRightIcon />
              </>
            );

            const handleMobileClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
              onClose();
              if (href.startsWith("/#") || href.startsWith("#")) {
                const hash = href.split("#")[1];
                if (pathname === "/") {
                  e.preventDefault();
                  const element = document.getElementById(hash);
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                    history.pushState(null, "", href);
                  }
                }
              }
            };

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={rowClass}
                  onClick={(e) => handleMobileClick(e, link.href)}
                >
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

function NavbarContent() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Initialize state based on window.location.pathname fallback if pathname isn't fully ready yet on mount
  const getIsLeaderboard = () => {
    if (typeof window !== "undefined") {
      return window.location.pathname === "/esports/leaderboard";
    }
    return pathname === "/esports/leaderboard";
  };
  const isLeaderboard = getIsLeaderboard();
  const [hideForIntro, setHideForIntro] = useState(isLeaderboard);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Synchronously update transition states during render to avoid layout hydration pop-up/fade glitches
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setHideForIntro(pathname === "/esports/leaderboard");
  }

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Manually handle page routing with hash anchors (e.g. /esports -> /#games)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const targetId = hash.replace("#", "");
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/esports/leaderboard") {
      const timer = setTimeout(() => {
        setHideForIntro(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    if (status !== "authenticated") {
      setIsAdmin(false);
      return;
    }
    fetch("/api/admin/me")
      .then((r) => setIsAdmin(r.ok))
      .catch(() => setIsAdmin(false));
  }, [status, session?.user?.id]);

  const [qaEnabled, setQaEnabled] = useState(false);

  useEffect(() => {
    function loadQaStatus() {
      fetch("/api/qa/status", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { enabled: false }))
        .then((data: { enabled?: boolean }) => setQaEnabled(Boolean(data.enabled)))
        .catch(() => setQaEnabled(false));
    }
    loadQaStatus();
    window.addEventListener("focus", loadQaStatus);
    return () => window.removeEventListener("focus", loadQaStatus);
  }, [pathname]);

  if (pathname && isAuthRoute(pathname)) return null;

  const signedIn = status === "authenticated" && session?.user;
  const platform = isPlatformRoute(pathname);
  const logoHref = platform ? "/esports" : "/";

  const links: NavLinkItem[] = platform
    ? platformLinksBase
    : qaEnabled
      ? [...marketingLinksBase, qaNavLink]
      : marketingLinksBase;

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
        pointerEvents: hideForIntro ? "none" : "none", // standard layout pointerEvents
        opacity: hideForIntro ? 0 : 1,
        transition: "opacity 700ms ease-in-out",
      }}
    >
      <nav
        className={`site-nav-shell glass w-full max-w-[var(--container)] rounded-2xl px-3 py-[10px] sm:px-5 sm:py-[16px] ${hideForIntro ? "pointer-events-none" : "pointer-events-auto"
          }`}
        style={{ transform: "translateZ(0)" }}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Link href={logoHref} className="flex min-w-0 shrink items-center gap-2 sm:gap-3" aria-label="NTG Lounge">
            <Image
              src="/ntg-logo.png"
              alt="NTG Lounge"
              width={44}
              height={44}
              priority
              className="h-10 w-10 rounded-xl object-cover drop-shadow-[0_0_12px_rgba(94,234,212,0.55)] sm:h-11 sm:w-11"
            />
            <span className="truncate font-display text-[12px] font-semibold tracking-[0.12em] text-white/95 sm:text-[15px] sm:tracking-[0.18em]">
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
                        : link.href === "/qa"
                          ? pathname === "/qa"
                          : false
                  }
                  external={!platform && link.href.startsWith("#")}
                  badge={link.badge}
                />
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              className="site-nav-mobile-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <HamburgerIcon open={menuOpen} />
            </button>
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

        <MobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          links={links}
          pathname={pathname}
          platform={platform}
        />
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
      if (!isPlatformRoute(window.location.pathname) && !window.location.hash) {
        window.scrollTo(0, 0);
      }
    }
  }, []);

  if (!mounted) return null;

  return createPortal(<NavbarContent />, document.body);
}
