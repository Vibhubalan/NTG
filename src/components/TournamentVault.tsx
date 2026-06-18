"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import BrandIcon from "./ui/BrandIcon";
import { allowPastTournamentClicks } from "@/lib/env";
import StatusBadge from "@/components/platform/ui/StatusBadge";
import type { TournamentVaultProps } from "./tournaments/types";

export default function TournamentVault({ tournaments, registration }: TournamentVaultProps) {
  const showBanner = registration?.active ?? false;

  return (
    <section id="vault" className="relative mx-auto w-full max-w-6xl scroll-mt-28 px-5 py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-1/3 top-1/2 h-[50vh] w-[50vh] rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.10),transparent_65%)] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-14 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
            03 · Trophy Room
          </span>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
            Cups <span className="font-display italic font-light text-white/55">we&apos;ve</span>{" "}
            <span className="text-gradient-iris">hosted.</span>
          </h2>
        </div>
        <p className="max-w-sm text-white/55">
          Seven cups on the board, two more loading. The NTG tournament vault:
          every champion etched into the lounge&apos;s history.
        </p>
      </motion.div>

      <AnimatePresence>
        {showBanner && registration ? (
          <motion.aside
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mb-8 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            role="status"
            aria-live="polite"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/90">
                Now registering
              </p>
              <p className="mt-1 font-display text-base font-medium text-white sm:text-lg">
                {registration.message}
              </p>
              <p className="mt-0.5 text-xs text-white/50">
                {registration.title} · {registration.detail}
              </p>
            </div>
            <Link
              href={registration.href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-brand)]/35 bg-[var(--color-brand)]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-brand)] transition-colors hover:border-[var(--color-brand)]/55 hover:bg-[var(--color-brand)]/15"
            >
              Register
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </Link>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <motion.ol
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{
          visible: { transition: { staggerChildren: 0.06 } },
          hidden: {},
        }}
        className="relative space-y-3"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-[1.875rem] top-2 hidden h-[calc(100%-1rem)] w-px bg-gradient-to-b from-[var(--color-brand)]/35 via-white/10 to-transparent md:block"
        />
        {tournaments.map((t, i) => (
          <motion.li
            key={t.slug}
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
            }}
            style={{ ["--cup" as string]: t.hex }}
            className="group relative flex items-stretch gap-5"
          >
            <div className="relative z-10 hidden shrink-0 items-start pt-6 md:flex">
              <span className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl bg-[#0a1020] ring-1 ring-white/10 transition-all duration-500 group-hover:ring-[var(--cup)]/55">
                <span className="absolute inset-0 rounded-2xl bg-[var(--cup)] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-25" />
                <span className="text-white/75 transition-colors duration-500 group-hover:text-[var(--cup)]">
                  <BrandIcon path={t.iconPath} title={t.name} className="h-6 w-6" />
                </span>
              </span>
            </div>

            {t.status === "Hosted" && !allowPastTournamentClicks ? (
              <div
                className="flex-1 cursor-default overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] opacity-80"
                aria-disabled="true"
              >
                <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
                  <div className="flex items-center gap-4">
                    <span
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0a1020] md:hidden"
                      style={{
                        color: t.hex,
                        boxShadow: `inset 0 0 0 1px ${t.hex}55`,
                      }}
                    >
                      <BrandIcon path={t.iconPath} title={t.name} className="h-5 w-5" />
                    </span>
                    <span className="hidden font-display text-2xl font-black tabular-nums text-white/15 sm:text-3xl md:inline">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-display text-xl font-semibold tracking-[-0.01em] text-white sm:text-2xl flex flex-wrap items-center gap-3">
                        <span>{t.name}</span>
                        {t.championName && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-400/30">
                            🏆 Winner: {t.championName}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
                        {t.game} · {t.season}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/55 ring-1 ring-inset ring-white/10">
                      {t.date}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href={`/esports/tournaments/${t.slug}`}
                className="flex-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/15 hover:bg-white/[0.04]"
              >
                <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
                  <div className="flex items-center gap-4">
                    <span
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0a1020] md:hidden"
                      style={{
                        color: t.hex,
                        boxShadow: `inset 0 0 0 1px ${t.hex}55`,
                      }}
                    >
                      <BrandIcon path={t.iconPath} title={t.name} className="h-5 w-5" />
                    </span>
                    <span className="hidden font-display text-2xl font-black tabular-nums text-white/15 sm:text-3xl md:inline">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-display text-xl font-semibold tracking-[-0.01em] text-white sm:text-2xl flex flex-wrap items-center gap-3">
                        <span>{t.name}</span>
                        {t.championName && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-400/30">
                            🏆 Winner: {t.championName}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
                        {t.game} · {t.season}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/55 ring-1 ring-inset ring-white/10">
                      {t.date}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              </Link>
            )}
          </motion.li>
        ))}
      </motion.ol>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 flex flex-col items-center gap-3 text-center text-sm text-white/45 sm:flex-row sm:justify-center"
      >
        <span>
          Want in on the next cup?{" "}
          <Link href="/esports/tournaments" className="text-gradient-brand font-medium hover:underline">
            Browse tournaments
          </Link>
        </span>
      </motion.div>
    </section>
  );
}
