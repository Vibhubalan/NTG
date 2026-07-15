"use client";

import { motion } from "framer-motion";
import { brand, socials } from "@/lib/data";
import BrandIcon from "./ui/BrandIcon";
import {
  mapsSearchUrl,
  whatsappInquiryUrl,
} from "@/lib/env";

const contacts = [
  {
    label: brand.address,
    sub: "Mangaluru, Karnataka",
    icon: (
      <>
        <path d="M12 21s7-6.4 7-11a7 7 0 10-14 0c0 4.6 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  },
  {
    label: `Open Daily · ${brand.hours}`,
    sub: "Walk-ins welcome · squads always active",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
];

export default function VisitLounge() {
  return (
    <section id="visit" className="relative mx-auto w-full max-w-7xl scroll-mt-28 px-5 py-24 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-10 text-center"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          07 · Visit
        </span>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          Step{" "}
          <span className="font-display italic font-light text-white/55">inside</span>{" "}
          <span className="text-gradient-iris">the lounge.</span>
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="shine-border relative overflow-hidden rounded-[2rem]"
      >
        <div className="shine-border-inner glass-strong grid gap-10 rounded-[2rem] p-6 md:grid-cols-[1fr_1.05fr] md:gap-14 md:p-10 lg:gap-20">
          <div className="flex flex-col justify-center">
            <h3 className="font-display text-3xl font-semibold tracking-[-0.01em] text-white sm:text-4xl">
              {brand.name}.
            </h3>
            <p className="mt-3 max-w-sm text-white/55">
              {brand.tagline}. Drop by, plug up, play your sharpest. Just crash the lounge, gather your squad, and get playing.
            </p>

            <div className="mt-7 space-y-3">
              {contacts.map((c) => (
                <div key={c.label} className="flex items-start gap-3 text-sm text-white/75">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[var(--color-brand)] ring-1 ring-inset ring-white/10">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      {c.icon}
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block">{c.label}</span>
                    <span className="block text-xs text-white/40">{c.sub}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                {socials.map((s) => {
                  const brandColor =
                    s.name === "Instagram"
                      ? "text-[#EC4899] border-[#EC4899]/30 bg-[#EC4899]/5 hover:border-[#EC4899]/60 hover:bg-[#EC4899]/10 shadow-[0_0_10px_rgba(236,72,153,0.15)] hover:shadow-[0_0_20px_rgba(236,72,153,0.45)]"
                      : s.name === "Discord"
                      ? "text-[#5865F2] border-[#5865F2]/30 bg-[#5865F2]/5 hover:border-[#5865F2]/60 hover:bg-[#5865F2]/10 shadow-[0_0_10px_rgba(88,101,242,0.15)] hover:shadow-[0_0_20px_rgba(88,101,242,0.45)]"
                      : "text-[#25D366] border-[#25D366]/30 bg-[#25D366]/5 hover:border-[#25D366]/60 hover:bg-[#25D366]/10 shadow-[0_0_10px_rgba(37,211,102,0.15)] hover:shadow-[0_0_20px_rgba(37,211,102,0.45)]";

                  return (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.name}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 hover:scale-105 active:scale-95 ${brandColor}`}
                    >
                      <BrandIcon path={s.path} title={s.name} className="h-4 w-4 [filter:drop-shadow(0_0_1px_currentColor)]" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/*
            Neon teal map — locked, mobile-optimized.
            • Lazy-mounted iframe (no Google JS until near viewport)
            • Lighter filter chain on mobile, fuller chain on desktop
            • No backdrop-blur or animate-ping below `md` (GPU-cheap)
          */}
          <div className="group relative overflow-hidden rounded-3xl border border-[var(--color-brand)]/25 bg-[#060a14] [contain:layout_paint] [content-visibility:auto] md:shadow-[0_0_40px_rgba(94,234,212,0.08),inset_0_0_60px_rgba(124,58,237,0.05)]" style={{ minHeight: "clamp(15rem, 22vw, 22rem)" }} >
            <a
              href={mapsSearchUrl(`${brand.name}, ${brand.address}, Mangaluru`)}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 block cursor-pointer z-0"
            >
              <img
                src="/images/lounge-map@2x.png"
                srcSet="/images/lounge-map@2x.png 2x, /images/lounge-map.png 1x"
                alt="Map showing NTG Lounge location in Mangaluru"
                className="pointer-events-none absolute inset-0 h-[112%] w-full select-none object-cover [transform:translate3d(0,-5%,0)_scale(1.03)] [filter:invert(1)_hue-rotate(180deg)] md:[filter:invert(1)_hue-rotate(180deg)_brightness(0.92)_contrast(1.1)_saturate(1.4)]"
                loading="eager"
                decoding="async"
              />

              {/* One combined atmosphere overlay — was three separate gradients */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_10%,rgba(124,58,237,0.28),transparent_55%),radial-gradient(ellipse_at_10%_95%,rgba(34,211,238,0.22),transparent_55%),radial-gradient(circle_at_50%_50%,transparent_45%,rgba(6,10,20,0.78)_100%)]" />

              {/* Grid — desktop only (most expensive overlay on mobile) */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 hidden opacity-[0.08] md:block [background:linear-gradient(rgba(94,234,212,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(94,234,212,0.45)_1px,transparent_1px)] [background-size:48px_48px]"
              />
            </a>

            {/* HUD corner brackets */}
            <span aria-hidden className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-[var(--color-brand)]/65 z-20" />
            <span aria-hidden className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-[var(--color-brand)]/65 z-20" />
            <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-[var(--color-iris)]/55 z-20" />
            <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-[var(--color-iris)]/55 z-20" />

            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[var(--color-brand)]/20 z-20" />

            {/* Pin + callout — animate-ping desktop only, no blur on mobile */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center z-30">
              <div className="relative z-10">
                <span className="absolute -inset-8 hidden rounded-full bg-[var(--color-brand)]/25 motion-safe:md:block motion-safe:md:animate-ping z-0" />
                <span className="absolute -inset-4 hidden rounded-full bg-[var(--color-brand)]/35 blur-md md:block z-0" />
                {/* Ambient white map pin silhouette behind the circular badge */}
                <svg
                  viewBox="0 0 24 24"
                  className="absolute left-1/2 top-1/2 h-10 w-10 md:h-16 md:w-16 -translate-x-1/2 -translate-y-[37.5%] text-white/35 select-none pointer-events-none z-10"
                  fill="currentColor"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
                <span className="relative flex h-7 w-7 md:h-10 md:w-10 items-center justify-center rounded-full bg-[var(--color-brand)] text-[#04221d] ring-2 ring-white/40 shadow-[0_0_12px_rgba(94,234,212,0.85)] md:shadow-[0_0_30px_rgba(94,234,212,0.95),0_0_60px_rgba(94,234,212,0.45)] z-20">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 md:h-5 md:w-5" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" />
                    <circle cx="12" cy="9" r="2.5" fill="white" />
                  </svg>
                </span>
              </div>
              <div className="mt-2 md:mt-3 relative z-20 whitespace-nowrap rounded-xl border border-[var(--color-brand)]/45 bg-[#0a1020]/95 px-2.5 py-1 md:px-4 md:py-2 text-center md:bg-[#0a1020]/90 md:shadow-[0_0_22px_rgba(94,234,212,0.28)] md:backdrop-blur">
                <p className="font-display text-[10px] md:text-sm font-semibold tracking-wide text-white">
                  Namma <span className="text-[var(--color-brand)]">Tulunad</span> Gaming
                </p>
                <p className="mt-0.5 text-[7px] md:text-[9px] uppercase tracking-[0.26em] text-white/55">
                  NTG Esports Lounge
                </p>
              </div>
            </div>

            {/* Top-left pill */}
            <div className="pointer-events-none absolute left-5 top-[17px] inline-flex items-center rounded-full border border-[var(--color-brand)]/40 bg-[#0a1020]/95 px-2 py-0.5 md:px-3 md:py-1 text-[8px] md:text-[10px] font-medium uppercase tracking-[0.22em] md:tracking-[0.28em] text-[var(--color-brand)] md:bg-[#0a1020]/85 md:shadow-[0_0_14px_rgba(94,234,212,0.2)] md:backdrop-blur z-30">
              <span className="mr-1.5 inline-block h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-[var(--color-brand)] md:shadow-[0_0_6px_rgba(94,234,212,0.95)]" />
              Mangaluru
            </div>

            <a
              href={mapsSearchUrl(`${brand.name}, ${brand.address}, Mangaluru`)}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-[17px] right-5 inline-flex items-center gap-1 md:gap-1.5 rounded-full border border-[var(--color-brand)]/35 bg-[#0a1020]/95 px-2.5 py-1 md:px-3 md:py-1.5 text-[8px] md:text-[10px] font-medium uppercase tracking-[0.16em] md:tracking-[0.22em] text-white/95 transition-colors hover:border-[var(--color-brand)]/65 hover:text-[var(--color-brand)] md:bg-[#0a1020]/80 md:shadow-[0_0_16px_rgba(94,234,212,0.15)] md:backdrop-blur z-30"
            >
              Open in Maps
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 md:h-3 md:w-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
