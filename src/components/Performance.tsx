"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const championshipSlides = [
  "/arena/arena-tournament.png",
  "/arena/arena-finals.png",
  "/arena/arena-focus.png",
  "/arena/arena-ntg-station.png",
  "/arena/arena-competitive.png",
];

type ImageCardProps = {
  src: string;
  kicker: string;
  title: string;
  body: string;
  delay?: number;
  className?: string;
  imgClassName?: string;
};

function ImageCard({
  src,
  kicker,
  title,
  body,
  delay = 0,
  className = "",
  imgClassName = "aspect-[4/5]",
}: ImageCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay }}
      className={`group relative h-full min-h-[280px] overflow-hidden rounded-3xl border border-white/[0.08] ${className}`}
    >
      <div className={`relative h-full w-full ${imgClassName}`}>
        <Image
          src={src}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 40vw"
          className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/45 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,rgba(124,58,237,0.22),transparent_60%)]" />
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)] backdrop-blur">
          <span className="h-1 w-1 rounded-full bg-[var(--color-brand)]" />
          {kicker}
        </span>
        <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.01em] text-white sm:text-[1.65rem]">
          {title}
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/65">
          {body}
        </p>
      </div>
    </motion.article>
  );
}

type ChampionshipCardProps = {
  kicker: string;
  title: string;
  body: string;
  className?: string;
  imgClassName?: string;
};

function ChampionshipCard({
  kicker,
  title,
  body,
  className = "",
  imgClassName = "min-h-[360px] md:min-h-full md:aspect-auto",
}: ChampionshipCardProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % championshipSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65 }}
      className={`group relative h-full min-h-[280px] overflow-hidden rounded-3xl border border-white/[0.08] ${className}`}
    >
      <div className={`relative h-full w-full ${imgClassName}`}>
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={championshipSlides[index]}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={championshipSlides[index]}
              alt={`${title} — slide ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 55vw"
              priority={index === 0}
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/45 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,rgba(124,58,237,0.22),transparent_60%)]" />

        <div className="absolute right-4 top-4 flex gap-1.5">
          {championshipSlides.map((slide, i) => (
            <button
              key={slide}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === index
                  ? "w-5 bg-[var(--color-brand)]"
                  : "w-1.5 bg-white/35 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)] backdrop-blur">
          <span className="h-1 w-1 rounded-full bg-[var(--color-brand)]" />
          {kicker}
        </span>
        <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.01em] text-white sm:text-[1.65rem]">
          {title}
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/65">
          {body}
        </p>
      </div>
    </motion.article>
  );
}

function QuoteCard({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay }}
      className={`group glass-strong relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-7 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(110%_70%_at_100%_0%,rgba(124,58,237,0.22),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_0%_100%,rgba(34,211,238,0.14),transparent_55%)]" />

      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]">
          <span className="h-1 w-1 rounded-full bg-[var(--color-brand)]" />
          Player Voice
        </span>

        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="mt-4 h-5 w-5 text-white/15"
          fill="currentColor"
        >
          <path d="M7 7h4v4H7c0 2.2 1.8 4 4 4v2c-3.3 0-6-2.7-6-6V7zm9 0h4v4h-4c0 2.2 1.8 4 4 4v2c-3.3 0-6-2.7-6-6V7z" />
        </svg>

        <p className="mt-3 font-display text-base leading-snug tracking-[-0.005em] text-white/90 sm:text-lg">
          &ldquo;NTG is where my{" "}
          <span className="text-gradient-brand">best plays</span> live. The gear,
          the lights, the crowd — everything hits different.&rdquo;
        </p>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-iris)] text-[10px] font-bold tracking-wider text-[#0a0f1c]">
          FC
        </span>
        <div className="leading-tight">
          <p className="text-sm font-medium text-white">Fearlesscoconut</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
            AUC Cup Champion · Valorant
          </p>
        </div>
      </div>
    </motion.article>
  );
}

export default function Performance() {
  return (
    <section id="arena" className="relative mx-auto w-full max-w-6xl scroll-mt-28 px-5 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-12 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
            01 — The Arena
          </span>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
            Engineered{" "}
            <span className="font-display italic font-light text-white/55">for</span>{" "}
            <span className="text-gradient-iris">Performance.</span>
          </h2>
        </div>
        <p className="max-w-sm text-white/55">
          Championship-grade focus by day, electric atmosphere by night. Step
          in, plug up, take over.
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr] md:grid-rows-2 md:gap-5 md:min-h-[560px] lg:min-h-[620px]">
        <ChampionshipCard
          kicker="Live Tournaments"
          title="Championship Arena"
          body="Where the AUC Cup finals are won. Pro-grade stations built for clutch moments and total focus."
          className="md:row-span-2"
        />

        <ImageCard
          src="/arena/auction-nights.png"
          kicker="The Vibe"
          title="Auction Nights"
          body="Neon-soaked energy, packed houses, and a crowd that lives for the play."
          delay={0.08}
          imgClassName="min-h-[220px] md:min-h-full md:aspect-auto"
        />

        <QuoteCard delay={0.16} />
      </div>
    </section>
  );
}
