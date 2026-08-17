"use client";

import { useEffect, useState } from "react";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function split(diff: number): Parts {
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function HeroCountdown({
  endsAt,
  label,
}: {
  endsAt: string;
  label?: string;
}) {
  const [parts, setParts] = useState<Parts | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();

    function update() {
      const diff = target - Date.now();
      if (diff <= 0) {
        setParts(null);
        return;
      }
      setParts(split(diff));
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!parts) return null;

  const units: { value: string; unit: string }[] = [];
  if (parts.days > 0) units.push({ value: String(parts.days), unit: "d" });
  units.push({ value: pad(parts.hours), unit: "h" });
  units.push({ value: pad(parts.minutes), unit: "m" });
  units.push({ value: pad(parts.seconds), unit: "s" });

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      {label ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">{label}</p>
      ) : null}
      <div className="flex items-baseline gap-3 sm:gap-4">
        {units.map((item) => (
          <span key={item.unit} className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-white sm:text-5xl">
              {item.value}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:text-sm">
              {item.unit}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
