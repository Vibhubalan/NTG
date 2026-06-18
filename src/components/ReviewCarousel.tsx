"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { splitReviewHighlights, type Review } from "@/lib/reviews";

const fallbackReviews: Review[] = [
  {
    id: "fallback-1",
    author: "Rahul",
    text: "Insane setup and the vibe is unmatched. Best esports lounge in Mangaluru. Gear feels premium and the crowd brings real energy.",
    rating: 5,
    relativeTime: "Google Review",
  },
  {
    id: "fallback-2",
    author: "Aditya",
    text: "Tournaments here are amazing, AUC nights are fire. The atmosphere makes you play your sharpest. Total favourite spot.",
    rating: 5,
    relativeTime: "Google Review",
  },
  {
    id: "fallback-3",
    author: "Sneha",
    text: "Smooth stations, perfect peripherals and a crew that actually cares. The experience hits different from any other cafe in town.",
    rating: 5,
    relativeTime: "Google Review",
  },
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-iris)] text-[10px] font-bold tracking-wider text-[#0a0f1c]">
      {initials || "G"}
    </span>
  );
}

function HighlightedText({ text }: { text: string }) {
  const segments = splitReviewHighlights(text);
  return (
    <>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <span key={i} className="text-gradient-brand font-medium">
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

type Props = {
  className?: string;
  delay?: number;
};

export default function ReviewCarousel({ className = "", delay = 0 }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);

  // Fetch on mount; fall back to curated reviews if API returns empty.
  useEffect(() => {
    let active = true;
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((data: { reviews?: Review[] }) => {
        if (!active) return;
        const incoming = (data.reviews ?? []).filter((r) => r.text?.length);
        setReviews(incoming.length ? incoming : fallbackReviews);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setReviews(fallbackReviews);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Rotate every 7s when there are 2+ reviews.
  useEffect(() => {
    if (reviews.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % reviews.length);
    }, 7000);
    return () => clearInterval(t);
  }, [reviews.length]);

  const active = reviews[index];

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, delay }}
      className={`group glass-strong relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-7 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(110%_70%_at_100%_0%,rgba(124,58,237,0.22),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_0%_100%,rgba(34,211,238,0.14),transparent_55%)]" />

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]">
          <span className="h-1 w-1 rounded-full bg-[var(--color-brand)]" />
          Player Voice
        </span>
        {active ? (
          <span aria-hidden className="flex items-center gap-0.5 text-[var(--color-brand)]/85">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                viewBox="0 0 24 24"
                className={`h-3 w-3 ${i < (active.rating || 5) ? "fill-current" : "fill-white/15"}`}
              >
                <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.6L6 22l1.5-7.2L2 10l7.1-1.1z" />
              </svg>
            ))}
          </span>
        ) : null}
      </div>

      <div className="relative mt-4 min-h-0 flex-1">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="absolute -top-1 left-0 h-5 w-5 text-white/15"
          fill="currentColor"
        >
          <path d="M7 7h4v4H7c0 2.2 1.8 4 4 4v2c-3.3 0-6-2.7-6-6V7zm9 0h4v4h-4c0 2.2 1.8 4 4 4v2c-3.3 0-6-2.7-6-6V7z" />
        </svg>

        {/* Stable-height stage — children are absolutely positioned so layout
            never shifts during a review transition (no flicker). */}
        <div className="relative h-full overflow-hidden pl-7">
          {!loaded && (
            <div aria-hidden className="absolute inset-0">
              <span className="block h-3 w-5/6 rounded bg-white/10" />
              <span className="mt-2 block h-3 w-2/3 rounded bg-white/10" />
              <span className="mt-2 block h-3 w-3/4 rounded bg-white/10" />
            </div>
          )}

          <AnimatePresence initial={false}>
            {active ? (
              <motion.p
                key={active.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="absolute inset-0 line-clamp-5 font-display text-base leading-snug tracking-[-0.005em] text-white/90 sm:line-clamp-6 sm:text-lg lg:line-clamp-[7]"
                title={active.text}
              >
                <span aria-hidden>&ldquo;</span>
                <HighlightedText text={active.text} />
                <span aria-hidden>&rdquo;</span>
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-5 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {active ? (
            <>
              <Avatar name={active.author} />
              <div className="leading-tight">
                <p className="text-sm font-medium text-white">{active.author}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                  {active.relativeTime || "Google Review"}
                </p>
              </div>
            </>
          ) : null}
        </div>

        {loaded && reviews.length > 1 ? (
          reviews.length <= 6 ? (
            <div className="flex gap-1.5" role="tablist" aria-label="Reviews">
              {reviews.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Review ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === index
                      ? "w-5 bg-[var(--color-brand)]"
                      : "w-1.5 bg-white/30 hover:bg-white/55"
                  }`}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous review"
                onClick={() =>
                  setIndex((i) => (i - 1 + reviews.length) % reviews.length)
                }
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:border-white/25 hover:text-white"
              >
                ‹
              </button>
              <span className="min-w-[3.5rem] text-center text-[10px] tabular-nums uppercase tracking-[0.2em] text-white/45">
                {index + 1} / {reviews.length}
              </span>
              <button
                type="button"
                aria-label="Next review"
                onClick={() => setIndex((i) => (i + 1) % reviews.length)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:border-white/25 hover:text-white"
              >
                ›
              </button>
            </div>
          )
        ) : null}
      </div>
    </motion.article>
  );
}
