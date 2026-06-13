"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const links = [
  { label: "Arena", href: "#arena" },
  { label: "Games", href: "#games" },
  { label: "Trophies", href: "#vault" },
  { label: "Visit", href: "#visit" },
];

function NavbarContent() {
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
        className="glass pointer-events-auto flex w-full max-w-7xl items-center justify-between gap-6 rounded-2xl py-3 pl-5 pr-3"
        style={{ transform: "translateZ(0)" }}
      >
        <a href="#top" className="flex items-center gap-3.5" aria-label="NTG Lounge home">
          <Image
            src="/ntg-logo.png"
            alt="NTG Lounge"
            width={44}
            height={44}
            priority
            className="h-11 w-11 rounded-xl object-cover drop-shadow-[0_0_12px_rgba(94,234,212,0.55)]"
          />
          <span className="hidden font-display text-[15px] font-semibold tracking-[0.18em] text-white/95 sm:inline">
            NTG <span className="text-[var(--color-brand)]">LOUNGE</span>
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="group relative rounded-full px-5 py-2.5 text-[13px] font-medium uppercase tracking-[0.18em] text-white/65 transition-colors hover:text-white"
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute inset-x-4 bottom-1.5 h-px origin-left scale-x-0 bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-iris)] transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#visit"
          className="cta rounded-full px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.18em] transition-all hover:scale-[1.04] hover:brightness-110"
        >
          Reserve
        </a>
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
      window.scrollTo(0, 0);
    }
  }, []);

  if (!mounted) return null;

  return createPortal(<NavbarContent />, document.body);
}
