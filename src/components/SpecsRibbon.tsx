"use client";

import { motion } from "framer-motion";
import { specs } from "@/lib/data";

export default function SpecsRibbon() {
  return (
    <section id="specs" className="relative mx-auto w-full max-w-[var(--container)] scroll-mt-28 px-[clamp(1.25rem,_3vw,_4rem)] pt-12 sm:pt-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="shine-border relative overflow-hidden rounded-2xl"
      >
        <div className="shine-border-inner glass-strong relative overflow-hidden rounded-2xl">
          <div className="grid divide-y divide-white/[0.06] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {specs.map((s) => (
              <div
                key={s.label}
                className="group relative px-6 py-6 sm:px-7 sm:py-7"
              >
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">
                  {s.label}
                </p>
                <div className="mt-2">
                  <p className="font-display font-semibold tracking-tight text-white transition-colors group-hover:text-[var(--color-brand)]" style={{ fontSize: "clamp(1.5rem, 1.8vw, 2.5rem)" }}>
                    {s.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
