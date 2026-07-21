"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { brand } from "@/lib/data";
import { instagramUrl, showPlansSection, whatsappInquiryUrl } from "@/lib/env";

export default function CtaBanner() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 pb-24 [content-visibility:auto] sm:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
        className="shine-border relative overflow-hidden rounded-[2rem]"
      >
        <div className="shine-border-inner relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-10 sm:py-24">
          <div className="absolute inset-0 -z-10 bg-[#0a1020]" />
          {/* Combined dot pattern + dual radial glows in one layer (was 4 layers) */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(100%_100%_at_50%_0%,rgba(124,58,237,0.12),transparent_60%),radial-gradient(100%_100%_at_50%_100%,rgba(34,211,238,0.08),transparent_60%)]" />
          {/* Dot pattern — desktop only, expensive on mobile */}
          <div className="absolute inset-0 -z-10 hidden bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px] md:block" />
          {/* Noise — desktop only */}
          <div className="noise hidden opacity-20 md:block" />

          <motion.span
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.4em] text-white/75 backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
            Open · {brand.hours}
          </motion.span>

          <h2 className="mt-6 font-display text-4xl font-semibold tracking-[-0.025em] text-white sm:text-6xl lg:text-7xl">
            Ready to{" "}
            <span className="font-display italic font-light text-white/70">dominate?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-balance text-white/65">
            Gather your squad and step into Mangaluru&apos;s sharpest esports
            lounge. Just crash the lounge and get playing on PC, PS5, and pro setups.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cta group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] transition-all hover:scale-[1.03] hover:brightness-110"
            >
              Follow {brand.instagram}
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
