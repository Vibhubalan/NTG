"use client";

import { useEffect, useState } from "react";

/**
 * Premium circular countdown. Colour shifts cyan → amber → red as time runs out.
 * `totalSeconds` is the full timer length so the ring can show progress.
 */
export function AuctionTimerRing({
  timerEndsAt,
  totalSeconds,
  size = 132,
}: {
  timerEndsAt: string | null;
  totalSeconds: number;
  size?: number;
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!timerEndsAt) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const ms = new Date(timerEndsAt).getTime() - Date.now();
      setRemaining(Math.max(0, ms / 1000));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [timerEndsAt]);

  const total = Math.max(totalSeconds, 1);
  const fraction = timerEndsAt ? Math.min(remaining / total, 1) : 0;
  const secondsLeft = Math.ceil(remaining);

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);

  const color =
    !timerEndsAt || secondsLeft > total * 0.5
      ? "#22d3ee" // cyan
      : secondsLeft > total * 0.25
        ? "#fbbf24" // amber
        : "#f43f5e"; // red

  const urgent = timerEndsAt && secondsLeft <= 5 && secondsLeft > 0;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.15s linear, stroke 0.3s ease",
            filter: `drop-shadow(0 0 8px ${color}66)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {timerEndsAt ? (
          <>
            <span
              className={`font-display font-bold tabular-nums leading-none ${urgent ? "animate-pulse" : ""}`}
              style={{ color, fontSize: size * 0.32 }}
            >
              {secondsLeft}
            </span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
              seconds
            </span>
          </>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            paused
          </span>
        )}
      </div>
    </div>
  );
}
