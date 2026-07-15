"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { LoungeCommerceHomeData } from "@lounge-commerce/domain/types";
import { whatsappInquiryUrl } from "@/lib/env";

export default function PlansAndHostClient({ data }: { data: LoungeCommerceHomeData }) {
  // SVG Icons
  const PS5Icon = () => (
    <svg className="h-6 w-6 text-[var(--color-brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );

  const PCIcon = () => (
    <svg className="h-6 w-6 text-[var(--color-brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 1 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
    </svg>
  );

  const FeaturedIcon = () => (
    <svg className="h-6 w-6 text-[var(--color-iris)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );

  const PromoIcon = () => (
    <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );

  const CrownIcon = () => (
    <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 4l3 12h14l3-12-6 5-4-7-4 7-6-5zm3 14h14v2H5v-2z" />
    </svg>
  );

  const InquiryIcon = () => (
    <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );

  const CheckIcon = ({ className = "text-[var(--color-brand)]" }: { className?: string }) => (
    <svg className={`h-4 w-4 shrink-0 mt-0.5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );

  return (
    <section id="plans" className="relative mx-auto w-full max-w-7xl scroll-mt-28 px-5 py-24 sm:py-32">
      {/* Background Glows */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-iris)]/5 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-16 text-center"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          05 · Plans & Passes
        </span>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          Passes, packs & <span className="text-gradient-iris">pricing.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-white/55">
          Choose the gaming setup and pricing plan that fits your grind. PlayStation 5 and high-spec PC pricing options.
        </p>
      </motion.div>

      {/* Unified 5-Card Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch">
        {/* Card 1: PlayStation 5 */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-brand)]/20 hover:bg-white/[0.04]"
        >
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10 mb-6">
              <PS5Icon />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-1">PlayStation 5</h3>
            <p className="text-xs text-white/55 mb-6">Console casual gaming</p>
            
            <ul className="space-y-3 text-[13px] text-white/70 mb-8">
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <span>Single & Multiplayer rates available</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <span>Popular games available (FC 26, etc)</span>
              </li>

            </ul>
          </div>

          <div>
            <div className="border-t border-white/5 pt-4 h-[110px] flex flex-col justify-center">
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">₹80</span>
                    <span className="text-xs text-white/55 font-medium">/ hr</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium tracking-wide text-white/45">Single player</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-white/80">₹70</span>
                    <span className="text-[11px] text-white/45 font-medium">/ hr · per person</span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium tracking-wide text-white/35">Group · 2–4 players</p>
                </div>
              </div>
            </div>
          </div>
        </motion.article>

        {/* Card 2: PC Gaming */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-brand)]/20 hover:bg-white/[0.04]"
        >
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10 mb-6">
              <PCIcon />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-1">PC Gaming</h3>
            <p className="text-xs text-white/55 mb-6">Esports grade battle stations</p>

            <ul className="space-y-3 text-[13px] text-white/70 mb-8">
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <span>300Hz Esports Monitors</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon />
                <span>RTX Graphic Rigs & Pro Peripherals</span>
              </li>

            </ul>
          </div>

          <div>
            <div className="border-t border-white/5 pt-4 h-[110px] flex flex-col justify-center">
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">₹119</span>
                  <span className="text-xs text-white/55 font-medium">/ hr Day</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-white/80">₹139</span>
                  <span className="text-[11px] text-white/45 font-medium">/ hr Night</span>
                </div>
              </div>
            </div>
          </div>
        </motion.article>

        {/* Card 3: 3 Hours Pack (HIGHLIGHTED FEATURED CARD) */}
        <motion.article
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-[var(--color-iris)]/50 bg-gradient-to-b from-[var(--color-iris)]/10 via-white/[0.02] to-transparent p-6 shadow-[0_0_30px_rgba(124,58,237,0.12)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-iris)] hover:shadow-[0_0_40px_rgba(124,58,237,0.22)] ring-1 ring-[var(--color-iris)]/25"
        >
          {/* Subtle top edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-iris)]/50 to-transparent" />
          
          <div>
            <div className="mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-iris)]/10 ring-1 ring-[var(--color-iris)]/30 mb-3">
                <FeaturedIcon />
              </div>
              <span className="rounded-full border border-[var(--color-iris)]/30 bg-[var(--color-iris)]/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-purple-300">
                Most Popular
              </span>
            </div>
            
            <h3 className="font-display text-xl font-bold text-white mb-1">3 Hours Pack</h3>
            <p className="text-xs text-purple-200/55 mb-6">Best value for ranked players</p>

            <ul className="space-y-3 text-[13px] text-purple-100/70 mb-8">
              <li className="flex items-start gap-2.5">
                <CheckIcon className="text-[var(--color-iris)]" />
                <span>Vastly discounted bundle rate</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon className="text-[var(--color-iris)]" />
                <span>Day & night rates available</span>
              </li>

            </ul>
          </div>

          <div>
            <div className="border-t border-[var(--color-iris)]/20 pt-4 h-[110px] flex flex-col justify-center">
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">₹349</span>
                  <span className="text-xs text-purple-300/70 font-semibold">/ Day Pack</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-purple-200">₹409</span>
                  <span className="text-[11px] text-purple-300/50 font-medium">/ Night Pack</span>
                </div>
              </div>
            </div>
          </div>
        </motion.article>

        {/* Card 4: Monthly Unlimited Deal (HIGHLIGHTED PREMIUM GOLD CARD) */}
        <motion.article
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-amber-500/50 bg-gradient-to-b from-amber-500/12 via-white/[0.02] to-transparent p-6 shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/25"
        >
          {/* Subtle top edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

          <div>
            <div className="mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/30 mb-3">
                <CrownIcon />
              </div>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300">
                Monthly Pass
              </span>
            </div>
            
            <h3 className="font-display text-xl font-bold text-white mb-1">Monthly Unlimited</h3>
            <p className="text-xs text-amber-200/55 mb-6">Day hours gaming package</p>

            <ul className="space-y-3 text-[13px] text-amber-100/70 mb-8">
              <li className="flex items-start gap-2.5">
                <CheckIcon className="text-amber-400" />
                <span>Unlimited gaming access</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon className="text-amber-400" />
                <span>Valid during Day Hours only</span>
              </li>

            </ul>
          </div>

          <div>
            <div className="border-t border-amber-500/20 pt-4 h-[110px] flex flex-col justify-center">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">₹6,000</span>
                <span className="text-xs text-amber-300/70 font-semibold">/ Month</span>
              </div>
            </div>
          </div>
        </motion.article>

        {/* Card 5: More Packs Inquiry Card */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 via-white/[0.01] to-transparent p-6 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-white/[0.04]"
        >
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10 mb-6">
              <InquiryIcon />
            </div>
            
            <h3 className="font-display text-xl font-bold text-white mb-1">More Packs</h3>
            <p className="text-xs text-white/55 mb-6">Custom packs & longer durations</p>

            <p className="text-[13px] text-white/60 leading-relaxed mb-6">
              We have a variety of other packs available (5-hour packs, 6-hour packs, and group discounts).
            </p>
          </div>

          <div>
            <div className="border-t border-white/5 pt-4 h-[110px] flex flex-col justify-center">
              <a
                href={whatsappInquiryUrl("Hi NTG Lounge, I'd like to ask about other packs available (5hr, 6hr, group discounts, etc.).")}
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn relative flex w-full max-w-[220px] mx-auto items-center justify-center gap-1.5 overflow-hidden rounded-full bg-cyan-500/10 border border-cyan-500/35 px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.15em] text-cyan-400 transition-all hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"
              >
                <span>Contact Us</span>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" fill="currentColor">
                  <path d="M12.04 2C6.6 2 2.16 6.43 2.16 11.86c0 1.91.5 3.78 1.45 5.42L2 22l4.86-1.57a9.86 9.86 0 005.18 1.41c5.43 0 9.87-4.43 9.87-9.86A9.83 9.83 0 0012.04 2zm4.65 11.85c-.25-.13-1.5-.74-1.74-.83-.23-.08-.4-.13-.57.13-.17.25-.66.83-.81 1-.15.17-.3.19-.55.06-.25-.13-1.07-.4-2.04-1.27-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.3.38-.45.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.45-.06-.13-.57-1.37-.78-1.87-.21-.5-.42-.43-.57-.43h-.49c-.17 0-.45.06-.69.31-.23.25-.9.88-.9 2.15 0 1.27.92 2.5 1.05 2.67.13.17 1.81 2.77 4.4 3.88.62.27 1.1.43 1.47.55.62.2 1.18.17 1.62.1.5-.07 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.17-.48-.29z" />
                </svg>
              </a>
            </div>
          </div>
        </motion.article>
      </div>

      {/* Night Rates Disclaimer */}
      <div className="mt-8 text-center">
        <span className="text-[11px] font-medium text-white/35 uppercase tracking-wider bg-white/[0.01] border border-white/5 rounded-full px-4 py-1.5">
          * Night packs & rates start after 10:00 PM IST
        </span>
      </div>


    </section>
  );
}
