"use client";

import React, { useEffect, useRef, useState } from "react";

interface SplitTextProps {
  text: string;
  className?: string;
  as?: React.ElementType;
  /** Delay in ms between each character (default: 22ms) */
  stagger?: number;
  /** Duration of each character's transition in ms (default: 600ms) */
  duration?: number;
  /** Additional delay before the whole animation starts, in ms (default: 0) */
  delay?: number;
}

/**
 * Splits text into individual characters, each masked by an overflow-hidden
 * wrapper. On desktop (≥1024 px), characters rise upward one by one the first
 * time the element enters the viewport. On mobile/tablet the text is shown
 * immediately with no animation.
 */
export default function SplitText({
  text,
  className = "",
  as: Tag = "span",
  stagger = 22,
  duration = 620,
  delay = 0,
}: SplitTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  /* Determine desktop once on mount (avoid SSR mismatch) */
  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024);
  }, []);

  /* Set up IntersectionObserver — only animate on desktop */
  useEffect(() => {
    if (!isDesktop) {
      setRevealed(true);
      return;
    }

    const el = ref.current;
    if (!el) {
      // Fallback: no element ref, just reveal
      setRevealed(true);
      return;
    }

    // Safety timeout — if observer never fires (element already in view before
    // attaching, or any other edge case), reveal after max(delay + 200ms, 1.5s)
    const safetyMs = Math.max(delay + 200, 1500);
    const safetyTimer = setTimeout(() => setRevealed(true), safetyMs);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(safetyTimer);
          setRevealed(true);
          observer.unobserve(entry.target); // fire only once
        }
      },
      { threshold: 0.01 }
    );

    observer.observe(el);
    return () => {
      clearTimeout(safetyTimer);
      observer.disconnect();
    };
  }, [isDesktop, delay]);

  /* Split text into words → characters */
  const words = text.split(" ");
  let globalCharIndex = 0;

  const easing = `cubic-bezier(0.22, 1, 0.36, 1)`;

  return (
    <Tag ref={ref} className={`inline ${className}`} aria-label={text}>
      {words.map((word, wIdx) => {
        const chars = word.split("");

        return (
          <span
            key={wIdx}
            className="inline-block overflow-hidden"
            aria-hidden="true"
          >
            {chars.map((char) => {
              const charDelay = delay + globalCharIndex * stagger;
              globalCharIndex++;

              return (
                <span
                  key={`${wIdx}-${char}-${charDelay}`}
                  className="inline-block"
                  style={{
                    transform: revealed ? "translateY(0)" : "translateY(105%)",
                    opacity: revealed ? 1 : 0,
                    transition: revealed
                      ? `transform ${duration}ms ${easing} ${charDelay}ms, opacity ${duration * 0.6}ms ease ${charDelay}ms`
                      : "none",
                    willChange: "transform",
                  }}
                >
                  {char}
                </span>
              );
            })}

            {/* Space between words — never clip */}
            {wIdx < words.length - 1 && (
              <span className="inline-block">&nbsp;</span>
            )}
          </span>
        );
      })}
    </Tag>
  );
}
