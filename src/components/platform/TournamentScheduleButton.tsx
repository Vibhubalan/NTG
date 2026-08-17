"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import TournamentCalendar from "@/components/platform/TournamentCalendar";
import type { TournamentPreview } from "@core/contracts";

type Props = {
  tournaments: TournamentPreview[];
};

export default function TournamentScheduleButton({ tournaments }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open schedule"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/80 transition-colors hover:border-[var(--color-brand)]/40 hover:text-white sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-[11px] sm:font-semibold sm:uppercase sm:tracking-[0.18em]"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 3v2m8-2v2M5 8h14M6 5h12a1 1 0 011 1v13a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1z"
          />
        </svg>
        <span className="hidden sm:inline">Schedule</span>
      </button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <button
                type="button"
                aria-label="Close schedule"
                className="absolute inset-0 bg-black/65 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 flex max-h-[min(34rem,82vh)] w-full max-w-[21rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl sm:max-h-[min(40rem,86vh)] sm:max-w-4xl"
              >
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-5 sm:py-3">
                  <h2 id={titleId} className="font-display text-sm font-bold text-white sm:text-lg">
                    Schedule
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto px-3 pb-3 sm:px-5 sm:pb-5">
                  <TournamentCalendar
                    tournaments={tournaments}
                    defaultToToday
                    startWithSchedule
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
