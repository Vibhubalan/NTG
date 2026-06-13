"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const features: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Elite Hardware",
    body: "Ryzen 5 7600X · RTX 5060 · 300Hz monitors. We provide the tools, you provide the talent.",
    icon: (
      <path d="M4 7h16M4 7v10h16V7M4 7l2-3h12l2 3M9 21h6M12 17v4" />
    ),
  },
  {
    title: "The Atmosphere",
    body: "Climate control, choreographed lighting, lounge seating — built for long sessions and long memories.",
    icon: (
      <path d="M12 3C8 7 6 10 6 13a6 6 0 0012 0c0-3-2-6-6-10zM12 19v2" />
    ),
  },
  {
    title: "Private Vaults",
    body: "Soundproof booths for tournament prep, screenings, birthdays — your squad, your stage.",
    icon: (
      <path d="M5 11V8a7 7 0 0114 0v3M4 11h16v10H4V11zM12 15v3" />
    ),
  },
];

export default function GoldStandard() {
  return (
    <section id="standard" className="relative mx-auto w-full max-w-6xl scroll-mt-28 px-5 py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[36vh] w-[80vh] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(168,85,247,0.16),transparent_65%)] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-14 text-center"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          04 — The Standard
        </span>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          <span className="font-display italic font-light text-white/55">The</span>{" "}
          <span className="text-gradient-brand">Gold Standard.</span>
        </h2>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: i * 0.1 }}
            className="shine-border group relative overflow-hidden rounded-3xl"
          >
            <div className="shine-border-inner glass relative h-full rounded-3xl p-7 sm:p-8">
              <span
                aria-hidden
                className="text-outline pointer-events-none absolute -right-2 -top-4 select-none font-display text-7xl font-black leading-none tracking-[-0.04em]"
              >
                0{i + 1}
              </span>

              <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-1 ring-inset ring-white/10 transition-transform duration-500 group-hover:scale-110">
                <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(94,234,212,0.35),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="relative h-6 w-6 text-[var(--color-brand)]"
                >
                  {f.icon}
                </svg>
              </div>

              <h3 className="font-display text-xl font-semibold tracking-[-0.01em] text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{f.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
