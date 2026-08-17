"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HeroHomeSlide from "./HeroHomeSlide";
import HeroTournamentSlide from "./HeroTournamentSlide";
import HeroListingsSlide from "./HeroListingsSlide";
import HeroSocialsSlide from "./HeroSocialsSlide";
import type { HeroCarouselData } from "./hero-carousel-types";

type SlideId = "home" | "tournaments" | "listings" | "socials";

const SLIDE_MS: Record<SlideId, number> = {
  home: 5500,
  tournaments: 7000,
  listings: 6000,
  socials: 5000,
};

type Props = {
  data: HeroCarouselData;
};

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      className="h-5 w-5 sm:h-6 sm:w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden
    >
      {dir === "left" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      )}
    </svg>
  );
}

export default function HeroCarousel({ data }: Props) {
  const slides = useMemo(() => {
    const ids: SlideId[] = ["home", "tournaments"];
    if (data.listings.length > 0) ids.push("listings");
    if (data.socials.length > 0) ids.push("socials");
    return ids;
  }, [data.listings.length, data.socials.length]);

  const [index, setIndex] = useState(0);
  const count = slides.length;
  const active = slides[Math.min(index, count - 1)] ?? "home";
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    if (index >= count) {
      setIndex(0);
      return;
    }
    if (count <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const slide = slides[index] ?? "home";
    const dwell =
      slide === "tournaments" && (data.tournament?.mode === "status" || data.tournament?.mode === "open")
        ? 9000
        : (SLIDE_MS[slide] ?? 5500);
    const id = window.setTimeout(() => go(1), dwell);
    return () => window.clearTimeout(id);
  }, [count, data.tournament?.mode, go, index, slides]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(dx) < 56) return;
    go(dx > 0 ? -1 : 1);
  }

  return (
    <div
      className="relative h-full w-full"
      role="region"
      aria-roledescription="carousel"
      aria-label="Homepage highlights"
      aria-live="off"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          role="group"
          aria-roledescription="slide"
          aria-label={
            active === "home"
              ? "Home"
              : active === "tournaments"
                ? "Tournaments"
                : active === "listings"
                  ? "Listings"
                  : "Socials"
          }
        >
          {active === "home" ? <HeroHomeSlide /> : null}
          {active === "tournaments" ? <HeroTournamentSlide data={data.tournament} /> : null}
          {active === "listings" ? <HeroListingsSlide listings={data.listings} /> : null}
          {active === "socials" ? <HeroSocialsSlide socials={data.socials} /> : null}
        </motion.div>
      </AnimatePresence>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/45 transition-colors hover:text-white sm:left-4 sm:h-12 sm:w-12"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/45 transition-colors hover:text-white sm:right-4 sm:h-12 sm:w-12"
          >
            <Chevron dir="right" />
          </button>
        </>
      ) : null}
    </div>
  );
}
