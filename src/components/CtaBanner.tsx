"use client";

import { motion } from "framer-motion";
import { brand } from "@/lib/data";
import { instagramUrl, whatsappInquiryUrl } from "@/lib/env";

export default function CtaBanner() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-24 [content-visibility:auto] sm:pb-32">
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
            Book a station, gather your squad, and step into Mangaluru&apos;s
            sharpest esports lounge. PC · PS5 · Tournament setups, primed for
            action.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href={whatsappInquiryUrl(
                "Hi NTG Lounge, I'd like to book a station / inquire about availability.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="cta group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] transition-all hover:scale-[1.03] hover:brightness-110"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12.04 2C6.6 2 2.16 6.43 2.16 11.86c0 1.91.5 3.78 1.45 5.42L2 22l4.86-1.57a9.86 9.86 0 005.18 1.41c5.43 0 9.87-4.43 9.87-9.86A9.83 9.83 0 0012.04 2zm4.65 11.85c-.25-.13-1.5-.74-1.74-.83-.23-.08-.4-.13-.57.13-.17.25-.66.83-.81 1-.15.17-.3.19-.55.06-.25-.13-1.07-.4-2.04-1.27-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.3.38-.45.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.45-.06-.13-.57-1.37-.78-1.87-.21-.5-.42-.43-.57-.43h-.49c-.17 0-.45.06-.69.31-.23.25-.9.88-.9 2.15 0 1.27.92 2.5 1.05 2.67.13.17 1.81 2.77 4.4 3.88.62.27 1.1.43 1.47.55.62.2 1.18.17 1.62.1.5-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.17-.48-.29z" />
              </svg>
              Inquire on WhatsApp
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-full px-7 py-3.5 text-sm font-medium uppercase tracking-[0.18em] text-white/85 transition-colors hover:text-white"
            >
              Follow {brand.instagram}
            </a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
