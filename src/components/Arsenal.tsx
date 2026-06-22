"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import BrandIcon from "./ui/BrandIcon";
import { games, platforms, services } from "@/lib/data";

export default function Arsenal() {
  return (
    <section id="games" className="relative mx-auto w-full max-w-6xl scroll-mt-28 px-5 py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[40vh] w-[60vh] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(168,85,247,0.14),transparent_65%)] blur-3xl" />
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
            02 · Games
          </span>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
            Every title.{" "}
            <span className="font-display italic font-light text-white/55">On tap.</span>
          </h2>
        </div>
        <p className="max-w-sm text-white/55">
          From tactical FPS to MOBA marathons, every title in the lineup runs
          on full premium hardware, ready when you are.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{
          visible: { transition: { staggerChildren: 0.04 } },
          hidden: {}
        }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3"
      >
        {games.map((g) => (
          <motion.div
            key={g.slug}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } }
            }}
            style={{ ["--game" as string]: g.hex }}
            className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/15 hover:bg-white/[0.04]"
          >
            {/* Background art image (only for cards that have one) */}
            {g.bgImage && (
              <Image
                src={g.bgImage}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover origin-right scale-100 opacity-20 brightness-75 transition-all duration-500 ease-out group-hover:scale-110 group-hover:opacity-45 group-hover:brightness-110"
                style={{ objectPosition: g.bgPosition || "right 15%" }}
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_0%_50%,var(--game),transparent_70%)] opacity-[0.18] mix-blend-soft-light md:opacity-0 md:transition-opacity md:duration-500 md:group-hover:opacity-100" />
            <span
              className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-[var(--game)] ring-1 ring-inset ring-[var(--game)]/35 transition-all duration-500 max-md:scale-105 md:text-white/85 md:ring-white/10 md:group-hover:scale-105 md:group-hover:text-[var(--game)] md:group-hover:ring-[var(--game)]/40"
            >
              <BrandIcon path={g.path} title={g.name} className="h-6 w-6" />
            </span>
            <div className="relative z-10 min-w-0">
              <p className="truncate font-display text-base font-medium text-white">
                {g.name}
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                {g.category}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Platforms / services strip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55, delay: 0.1 }}
        className="mt-10 flex flex-col items-center justify-between gap-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 sm:flex-row"
      >
        <div className="flex items-center gap-5 text-white/55">
          <span className="text-[10px] uppercase tracking-[0.32em] text-white/35">
            Platforms
          </span>
          <div className="flex items-center gap-4">
            {platforms.map((p) => (
              <span
                key={p.name}
                title={p.name}
                className="text-white/55 transition-colors hover:text-white"
              >
                <BrandIcon path={p.path} title={p.name} className="h-5 w-5" />
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-5">
          <span className="text-[10px] uppercase tracking-[0.32em] text-white/35">
            Also
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {services.map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/65"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
