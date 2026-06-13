"use client";

import { motion } from "framer-motion";
import { brand, socials } from "@/lib/data";
import BrandIcon from "./ui/BrandIcon";

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
    sub: "Squads always active",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    label: brand.link,
    sub: "All bookings · social · contact",
    icon: (
      <>
        <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 10-5.66-5.66l-1 1" />
        <path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 105.66 5.66l1-1" />
      </>
    ),
  },
];

export default function VisitLounge() {
  return (
    <section id="visit" className="relative mx-auto w-full max-w-6xl scroll-mt-28 px-5 py-24 sm:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-10 text-center"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          06 — Visit
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
        <div className="shine-border-inner glass-strong grid gap-8 rounded-[2rem] p-6 md:grid-cols-2 md:p-10">
          <div className="flex flex-col justify-center">
            <h3 className="font-display text-3xl font-semibold tracking-[-0.01em] text-white sm:text-4xl">
              {brand.name}.
            </h3>
            <p className="mt-3 max-w-sm text-white/55">
              {brand.tagline} — drop by, plug up, play your sharpest. Reservations
              recommended for tournament nights and private vaults.
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
                href={`https://${brand.link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cta rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition-all hover:scale-[1.03] hover:brightness-110"
              >
                Reserve via Linktree
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

          {/* Stylized map */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a1020]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(94,234,212,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(94,234,212,0.06)_1px,transparent_1px)] bg-[size:38px_38px]" />

            <div className="absolute left-0 top-1/4 h-[2px] w-full -rotate-6 bg-white/[0.07]" />
            <div className="absolute left-0 top-2/3 h-[2px] w-full rotate-3 bg-white/[0.06]" />
            <div className="absolute left-1/3 top-0 h-full w-[2px] rotate-3 bg-white/[0.07]" />
            <div className="absolute left-2/3 top-0 h-full w-[2px] -rotate-2 bg-white/[0.05]" />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_45%,rgba(168,85,247,0.22),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,211,238,0.16),transparent_60%)]" />

            <span className="absolute left-[28%] top-[30%] h-1.5 w-1.5 rounded-full bg-white/35" />
            <span className="absolute left-[72%] top-[68%] h-1.5 w-1.5 rounded-full bg-white/30" />
            <span className="absolute left-[40%] top-[78%] h-1.5 w-1.5 rounded-full bg-white/25" />
            <span className="absolute left-[78%] top-[20%] h-1.5 w-1.5 rounded-full bg-white/30" />

            <div className="absolute left-[55%] top-[45%] -translate-x-1/2 -translate-y-1/2">
              <span className="absolute -inset-6 animate-ping rounded-full bg-[var(--color-brand)]/25" />
              <span className="absolute -inset-3 rounded-full bg-[var(--color-brand)]/30 blur-md" />
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand)] text-[#04221d] shadow-[0_0_30px_rgba(94,234,212,0.9)] ring-2 ring-white/30">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" />
                </svg>
              </span>
              <span className="mt-2 block whitespace-nowrap rounded-md bg-black/65 px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                {brand.name}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
