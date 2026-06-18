"use client";

import { useCallback, useEffect, useState } from "react";

type Slide = {
  src: string;
  alt?: string;
  caption?: string;
};

type Props = {
  slides: Slide[];
  intervalMs?: number;
  className?: string;
  overlay?: React.ReactNode;
  /** Lighter gradient so background photos stay visible */
  dimOverlay?: boolean;
};

export default function ImageCarousel({
  slides,
  intervalMs = 5000,
  className = "",
  overlay,
  dimOverlay = true,
}: Props) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const visibleSlides = slides.filter((s) => s.src && !failed.has(s.src));

  const go = useCallback(
    (delta: number) => {
      if (visibleSlides.length <= 1) return;
      setIndex((i) => (i + delta + visibleSlides.length) % visibleSlides.length);
    },
    [visibleSlides.length],
  );

  useEffect(() => {
    if (visibleSlides.length <= 1) return;
    const timer = setInterval(() => go(1), intervalMs);
    return () => clearInterval(timer);
  }, [visibleSlides.length, go, intervalMs]);

  if (visibleSlides.length === 0) return null;

  const safeIndex = Math.min(index, visibleSlides.length - 1);
  const slide = visibleSlides[safeIndex];

  function markFailed(src: string) {
    setFailed((prev) => new Set(prev).add(src));
  }

  return (
    <div className={`group relative h-full min-h-full w-full overflow-hidden ${className}`}>
      {visibleSlides.map((s, i) => (
        <div
          key={s.src}
          className={`absolute inset-0 z-[1] transition-opacity duration-700 ${
            i === safeIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.src}
            alt={s.alt ?? ""}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            onError={() => markFailed(s.src)}
          />
        </div>
      ))}

      {dimOverlay ? (
        <div
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/85 via-black/45 to-black/15"
          aria-hidden
        />
      ) : null}

      {slide.caption ? (
        <div className="pointer-events-none absolute bottom-20 left-0 right-0 z-20 px-8 text-center sm:bottom-24">
          <p className="text-sm font-medium text-white/80 drop-shadow-md">{slide.caption}</p>
        </div>
      ) : null}

      {overlay ? <div className="pointer-events-none absolute inset-0 z-[3]">{overlay}</div> : null}

      {visibleSlides.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/90 opacity-0 ring-1 ring-white/10 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/70 sm:left-5"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white/90 opacity-0 ring-1 ring-white/10 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/70 sm:right-5"
          >
            ›
          </button>
        </>
      ) : null}
    </div>
  );
}
