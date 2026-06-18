"use client";

import { motion } from "framer-motion";
import { brand, socials } from "@/lib/data";
import BrandIcon from "./ui/BrandIcon";
import LazyMap from "./LazyMap";
import {
  mapsEmbedFor,
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
          05 · Visit
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
              {brand.tagline}. Drop by, plug up, play your sharpest. DM us on
              WhatsApp to inquire about slots, tournament nights and private vaults.
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
              <a
                href={whatsappInquiryUrl(
                  "Hi NTG Lounge, I'd like to inquire about a slot at the lounge.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="cta inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition-all hover:scale-[1.03] hover:brightness-110"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M12.04 2C6.6 2 2.16 6.43 2.16 11.86c0 1.91.5 3.78 1.45 5.42L2 22l4.86-1.57a9.86 9.86 0 005.18 1.41c5.43 0 9.87-4.43 9.87-9.86A9.83 9.83 0 0012.04 2zm0 17.94a8.07 8.07 0 01-4.34-1.27l-.31-.19-2.89.94.95-2.81-.2-.32a8.05 8.05 0 1114.86-4.43 8.07 8.07 0 01-8.07 8.08zm4.65-6.09c-.25-.13-1.5-.74-1.74-.83-.23-.08-.4-.13-.57.13-.17.25-.66.83-.81 1-.15.17-.3.19-.55.06-.25-.13-1.07-.4-2.04-1.27-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.3.38-.45.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.45-.06-.13-.57-1.37-.78-1.87-.21-.5-.42-.43-.57-.43h-.49c-.17 0-.45.06-.69.31-.23.25-.9.88-.9 2.15 0 1.27.92 2.5 1.05 2.67.13.17 1.81 2.77 4.4 3.88.62.27 1.1.43 1.47.55.62.2 1.18.17 1.62.1.5-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.17-.48-.29z" />
                </svg>
                Inquire on WhatsApp
              </a>
              <div className="flex items-center gap-2">
                {socials.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition-all hover:border-[var(--color-brand)]/40 hover:text-white"
                  >
                    <BrandIcon path={s.path} title={s.name} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/*
            Neon teal map — locked, mobile-optimized.
            • Lazy-mounted iframe (no Google JS until near viewport)
            • Lighter filter chain on mobile, fuller chain on desktop
            • No backdrop-blur or animate-ping below `md` (GPU-cheap)
          */}
          <div className="group relative min-h-[280px] overflow-hidden rounded-3xl border border-[var(--color-brand)]/25 bg-[#060a14] [contain:layout_paint] [content-visibility:auto] md:min-h-[340px] md:shadow-[0_0_40px_rgba(94,234,212,0.08),inset_0_0_60px_rgba(124,58,237,0.05)]">
            <LazyMap
              title={`Map · ${brand.name}`}
              src={mapsEmbedFor(brand.coords)}
              iframeClassName="pointer-events-none absolute inset-0 h-[112%] w-full border-0 select-none [transform:translate3d(0,-5%,0)_scale(1.03)] [filter:invert(1)_hue-rotate(180deg)] md:[filter:invert(1)_hue-rotate(180deg)_brightness(0.92)_contrast(1.1)_saturate(1.4)]"
            />

            {/* One combined atmosphere overlay — was three separate gradients */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_10%,rgba(124,58,237,0.28),transparent_55%),radial-gradient(ellipse_at_10%_95%,rgba(34,211,238,0.22),transparent_55%),radial-gradient(circle_at_50%_50%,transparent_45%,rgba(6,10,20,0.78)_100%)]" />

            {/* Grid — desktop only (most expensive overlay on mobile) */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 hidden opacity-[0.08] md:block [background:linear-gradient(rgba(94,234,212,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(94,234,212,0.45)_1px,transparent_1px)] [background-size:48px_48px]"
            />

            {/* HUD corner brackets */}
            <span aria-hidden className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-[var(--color-brand)]/65" />
            <span aria-hidden className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-[var(--color-brand)]/65" />
            <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-[var(--color-iris)]/55" />
            <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-[var(--color-iris)]/55" />

            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[var(--color-brand)]/20" />

            {/* Pin + callout — animate-ping desktop only, no blur on mobile */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <div className="relative">
                <span className="absolute -inset-8 hidden rounded-full bg-[var(--color-brand)]/25 motion-safe:md:block motion-safe:md:animate-ping" />
                <span className="absolute -inset-4 hidden rounded-full bg-[var(--color-brand)]/35 blur-md md:block" />
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand)] text-[#04221d] ring-2 ring-white/40 shadow-[0_0_18px_rgba(94,234,212,0.85)] md:shadow-[0_0_30px_rgba(94,234,212,0.95),0_0_60px_rgba(94,234,212,0.45)]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
                  </svg>
                </span>
              </div>
              <div className="mt-3 whitespace-nowrap rounded-xl border border-[var(--color-brand)]/45 bg-[#0a1020]/95 px-4 py-2 text-center md:bg-[#0a1020]/90 md:shadow-[0_0_22px_rgba(94,234,212,0.28)] md:backdrop-blur">
                <p className="font-display text-sm font-semibold tracking-wide text-white">
                  Namma <span className="text-[var(--color-brand)]">Tulunad</span> Gaming
                </p>
                <p className="mt-0.5 text-[9px] uppercase tracking-[0.26em] text-white/55">
                  NTG Esports Lounge
                </p>
              </div>
            </div>

            {/* Top-left pill */}
            <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center rounded-full border border-[var(--color-brand)]/40 bg-[#0a1020]/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.28em] text-[var(--color-brand)] md:bg-[#0a1020]/85 md:shadow-[0_0_14px_rgba(94,234,212,0.2)] md:backdrop-blur">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] md:shadow-[0_0_6px_rgba(94,234,212,0.95)]" />
              Mangaluru
            </div>

            <a
              href={mapsSearchUrl(`${brand.name}, ${brand.address}, Mangaluru`)}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand)]/35 bg-[#0a1020]/95 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/95 transition-colors hover:border-[var(--color-brand)]/65 hover:text-[var(--color-brand)] md:bg-[#0a1020]/80 md:shadow-[0_0_16px_rgba(94,234,212,0.15)] md:backdrop-blur"
            >
              Open in Maps
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
