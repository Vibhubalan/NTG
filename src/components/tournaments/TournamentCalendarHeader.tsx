"use client";

import { motion } from "framer-motion";

export default function TournamentCalendarHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mb-14 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
          03 · Competitive Schedule
        </span>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          Competitive <span className="font-display italic font-light text-white/55">lounge</span>{" "}
          <span className="text-gradient-iris">schedule.</span>
        </h2>
      </div>
      <p className="max-w-sm text-white/55">
        Our complete tournament schedule. Every phase, registration, and active match live on the town calendar.
      </p>
    </motion.div>
  );
}
