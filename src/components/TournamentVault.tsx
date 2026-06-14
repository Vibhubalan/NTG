"use client";

import { motion } from "framer-motion";
import BrandIcon from "./ui/BrandIcon";
import { tournaments } from "@/lib/data";

export default function TournamentVault() {
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
            03 — Trophy Room
          </span>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
            Cups <span className="font-display italic font-light text-white/55">we&apos;ve</span>{" "}
            <span className="text-gradient-iris">hosted.</span>
          </h2>
        </div>
        <p className="max-w-sm text-white/55">
          Five seasons hosted, one more loading. The NTG tournament vault —
          every champion etched into the lounge&apos;s history.
        </p>
      </motion.div>

      <motion.ol
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{
          visible: { transition: { staggerChildren: 0.06 } },
          hidden: {}
        }}
        className="relative space-y-3"
      >
        {/* vertical rail (hidden on mobile) */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[1.875rem] top-2 hidden h-[calc(100%-1rem)] w-px bg-gradient-to-b from-[var(--color-brand)]/35 via-white/10 to-transparent md:block"
        />
        {tournaments.map((t, i) => (
          <motion.li
            key={t.id}
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
            style={{ ["--cup" as string]: t.hex }}
            className="group relative flex items-stretch gap-5"
          >
            {/* timeline marker — desktop hover reveal */}
            <div className="relative z-10 hidden shrink-0 items-start pt-6 md:flex">
              <span className="relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl bg-[#0a1020] ring-1 ring-white/10 transition-all duration-500 group-hover:ring-[var(--cup)]/55">
                <span className="absolute inset-0 rounded-2xl bg-[var(--cup)] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-25" />
                <span className="text-white/75 transition-colors duration-500 group-hover:text-[var(--cup)]">
                  <BrandIcon path={t.iconPath} title={t.name} className="h-6 w-6" />
                </span>
              </span>
            </div>

            {/* card */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/15 hover:bg-white/[0.04]">
              <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
                <div className="flex items-center gap-4">
                  {/* Mobile: game logo (no hover on touch) */}
                  <span
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0a1020] md:hidden"
                    style={{
                      color: t.hex,
                      boxShadow: `inset 0 0 0 1px ${t.hex}55`,
                    }}
                  >
                    <BrandIcon path={t.iconPath} title={t.name} className="h-5 w-5" />
                  </span>
                  {/* Desktop: faded index in card */}
                  <span className="hidden font-display text-2xl font-black tabular-nums text-white/15 sm:text-3xl md:inline">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-display text-xl font-semibold tracking-[-0.01em] text-white sm:text-2xl">
                      {t.name}
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
                  {t.status === "Soon" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--color-brand)] ring-1 ring-inset ring-[var(--color-brand)]/45">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
                      </span>
                      Soon
                    </span>
                  ) : (
                    <span
                      className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white"
                      style={{
                        background: `${t.hex}1f`,
                        boxShadow: `inset 0 0 0 1px ${t.hex}55`,
                      }}
                    >
                      {t.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.li>
        ))}
      </motion.ol>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 text-center text-sm text-white/45"
      >
        Want in on the next cup? <span className="text-gradient-brand font-medium">DM us on WhatsApp.</span>
      </motion.div>
    </section>
  );
}
