"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { brand } from "@/lib/data";

const letters = [
  { letter: "N", word: "Namma", meaning: "Our" },
  { letter: "T", word: "Tulunad", meaning: "The Tulunad Land" },
  { letter: "G", word: "Gaming", meaning: "The Stage" },
];

export default function NtgStandard() {
  return (
    <section id="about" className="relative mx-auto w-full max-w-6xl scroll-mt-28 px-5 py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-0 top-1/3 h-[42vh] w-[42vh] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.16),transparent_65%)] blur-3xl" />
        <div className="absolute left-0 bottom-1/4 h-[36vh] w-[36vh] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.12),transparent_65%)] blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-14 text-center"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          04 · Heritage
        </span>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          What <span className="font-display italic font-light text-white/55">does</span>{" "}
          <span className="text-gradient-iris">NTG</span>{" "}
          <span className="font-display italic font-light text-white/55">mean?</span>
        </h2>
      </motion.div>

      <div className="grid items-center gap-12 md:grid-cols-5 md:gap-16">
        {/* Acronym breakdown */}
        <div className="md:col-span-3">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
              hidden: {}
            }}
            className="space-y-6 sm:space-y-7"
          >
            {letters.map((l) => (
              <motion.div
                key={l.letter}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: "easeOut" } }
                }}
                className="group flex items-center gap-5 border-b border-white/[0.06] pb-6 last:border-b-0 last:pb-0 sm:gap-7"
              >
                <span className="text-outline w-[2.5ch] shrink-0 font-display text-7xl font-black leading-none tracking-[-0.05em] max-md:[-webkit-text-stroke:1px_var(--color-brand)] max-md:drop-shadow-[0_0_14px_rgba(94,234,212,0.4)] md:transition-colors md:duration-500 md:group-hover:[-webkit-text-stroke:1px_var(--color-brand)] sm:text-8xl">
                  {l.letter}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-2xl font-semibold tracking-[-0.01em] text-white sm:text-3xl">
                    {l.word}
                  </p>
                  <p className="mt-1 text-sm uppercase tracking-[0.28em] text-white/40">
                    {l.meaning}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.35 }}
            className="mt-10 max-w-md text-base leading-relaxed text-white/60"
          >
            Born in the Tulunad heartland of coastal Karnataka.
            NTG is a love letter from{" "}
            <span className="text-gradient-brand font-medium">Mangaluru</span>{" "}
            to the players who&apos;ve made it home: a lounge built by the
            community, for the community.
          </motion.p>
        </div>

        {/* Medallion */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center md:col-span-2"
        >
          <div className="relative flex h-80 w-80 items-center justify-center sm:h-96 sm:w-96">
            <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.34),transparent_62%)] blur-2xl" />
            <div className="absolute inset-14 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.24),transparent_60%)] blur-2xl" />

            <svg viewBox="0 0 200 200" className="spin-slow absolute inset-0 h-full w-full" aria-hidden>
              <circle cx="100" cy="100" r="92" fill="none" stroke="url(#ringA)" strokeWidth="0.5" strokeDasharray="2 6" />
              <defs>
                <linearGradient id="ringA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5eead4" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="8" r="3" fill="#5eead4">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" />
              </circle>
            </svg>

            <svg viewBox="0 0 200 200" className="spin-slower absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)]" aria-hidden>
              <circle cx="100" cy="100" r="92" fill="none" stroke="url(#ringB)" strokeWidth="0.5" strokeDasharray="1 8" />
              <defs>
                <linearGradient id="ringB" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#d946ef" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <circle cx="8" cy="100" r="2" fill="#a855f7">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="4s" repeatCount="indefinite" />
              </circle>
            </svg>

            <div className="glass-strong relative flex h-52 w-52 items-center justify-center rounded-full sm:h-60 sm:w-60">
              <Image
                src="/ntg-logo.png"
                alt={brand.name}
                width={160}
                height={160}
                className="float-soft h-36 w-36 rounded-3xl object-cover drop-shadow-[0_0_28px_rgba(94,234,212,0.45)] sm:h-40 sm:w-40"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
