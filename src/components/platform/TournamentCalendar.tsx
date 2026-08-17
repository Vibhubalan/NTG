"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BrandIcon from "@/components/ui/BrandIcon";
import { toTournamentDisplay } from "@/lib/tournament-display";
import type { TournamentPreview } from "@core/contracts";

type DisplayTournament = TournamentPreview & {
  display: ReturnType<typeof toTournamentDisplay>;
};

type Props = {
  tournaments: TournamentPreview[];
  defaultToToday?: boolean;
  /** Open the day schedule immediately (used in the tournaments dialog). */
  startWithSchedule?: boolean;
};

type CalendarCell = {
  date: Date;
  isCurrentMonth: boolean;
  dayNum: number;
  tournaments: DisplayTournament[];
};

// Phase band rendered across multi-day spans (Apple Calendar style)
type EventBand = {
  tournamentId: string;
  phase: "registration" | "auction" | "tournament";
  color: string;      // hex
  isStart: boolean;
  isEnd: boolean;
  isActualStart: boolean;
  isActualEnd: boolean;
  label: string;      // shown only on start cell
};

export default function TournamentCalendar({
  tournaments,
  defaultToToday = false,
  startWithSchedule = false,
}: Props) {
  // Convert tournaments to display structure
  const displayTournaments = useMemo(() => {
    return tournaments.map((t) => ({
      ...t,
      display: toTournamentDisplay(t),
    }));
  }, [tournaments]);

  // Determine initial date:
  // 1. If defaultToToday is true, use current system date
  // 2. Closest ongoing/upcoming tournament
  // 3. Most recent completed tournament
  // 4. Current system date
  const initialDate = useMemo(() => {
    if (defaultToToday) {
      return new Date();
    }

    const activeList = displayTournaments.filter(
      (t) =>
        t.status === "IN_PROGRESS" ||
        t.status === "REGISTRATION_OPEN" ||
        t.status === "UPCOMING"
    );
    if (activeList.length > 0) {
      const sortedActive = [...activeList].sort(
        (a, b) =>
          (a.startsAt ? new Date(a.startsAt).getTime() : 0) -
          (b.startsAt ? new Date(b.startsAt).getTime() : 0)
      );
      if (sortedActive[0]?.startsAt) return new Date(sortedActive[0].startsAt);
    }

    const completed = displayTournaments.filter((t) => t.status === "COMPLETED");
    if (completed.length > 0) {
      const sorted = [...completed].sort(
        (a, b) =>
          (b.startsAt ? new Date(b.startsAt).getTime() : 0) -
          (a.startsAt ? new Date(a.startsAt).getTime() : 0)
      );
      if (sorted[0]?.startsAt) return new Date(sorted[0].startsAt);
    }

    return new Date();
  }, [displayTournaments, defaultToToday]);

  const [currentYear, setCurrentYear] = useState(() => initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(() => initialDate);
  const [activeTab, setActiveTab] = useState<"day" | "month">("day");
  const [scheduleOpen, setScheduleOpen] = useState(startWithSchedule);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(today);
    setActiveTab("day");
    setScheduleOpen(true);
  };

  const openScheduleForDate = (date: Date) => {
    setSelectedDate(date);
    setActiveTab("day");
    setScheduleOpen(true);
  };

  useEffect(() => {
    if (!scheduleOpen || startWithSchedule || !scheduleRef.current) return;
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;
    scheduleRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [scheduleOpen, selectedDate, startWithSchedule]);

  // Check if a date matches a specific year, month, and day
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  // Filter tournaments for a specific date
  const getTournamentsForDate = (date: Date) => {
    return displayTournaments.filter((t) => {
      if (!t.startsAt) return false;
      const tDate = new Date(t.startsAt);
      return (
        tDate.getFullYear() === date.getFullYear() &&
        tDate.getMonth() === date.getMonth() &&
        tDate.getDate() === date.getDate()
      );
    });
  };

  // Generate calendar grid cells (42 cells: 6 rows * 7 days)
  const cells = useMemo(() => {
    const arr: CalendarCell[] = [];

    // Week starts on Monday
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // Previous month's trailing days
    const prevMonthDate = new Date(currentYear, currentMonth, 0);
    const pmYear = prevMonthDate.getFullYear();
    const pmMonth = prevMonthDate.getMonth();
    const pmDays = prevMonthDate.getDate();

    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = pmDays - i;
      const cellDate = new Date(pmYear, pmMonth, dayNum);
      arr.push({
        date: cellDate,
        isCurrentMonth: false,
        dayNum,
        tournaments: getTournamentsForDate(cellDate),
      });
    }

    // Current month's days
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(currentYear, currentMonth, d);
      arr.push({
        date: cellDate,
        isCurrentMonth: true,
        dayNum: d,
        tournaments: getTournamentsForDate(cellDate),
      });
    }

    // Next month's leading days
    const remaining = 42 - arr.length;
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    const nmYear = nextMonthDate.getFullYear();
    const nmMonth = nextMonthDate.getMonth();

    for (let d = 1; d <= remaining; d++) {
      const cellDate = new Date(nmYear, nmMonth, d);
      arr.push({
        date: cellDate,
        isCurrentMonth: false,
        dayNum: d,
        tournaments: getTournamentsForDate(cellDate),
      });
    }

    return arr;
  }, [currentYear, currentMonth, displayTournaments]);

  // Compute event bands for every cell in the grid
  const cellBands = useMemo(() => {
    // Helper: normalize a Date to midnight local
    const toMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    // For each cell index, collect bands
    return cells.map((cell) => {
      const cellDay = toMidnight(cell.date);
      const cellTs = cellDay.getTime();
      const dayOfWeek = cell.date.getDay(); // 0=Sun, 1=Mon … 6=Sat
      const isWeekStart = dayOfWeek === 1; // Mon (our grid starts Mon)
      const isWeekEnd = dayOfWeek === 0;   // Sun

      const bands: EventBand[] = [];

      for (const t of displayTournaments) {
        // ── Registration band ──────────────────────────────────────
        if (t.registrationOpensAt && t.registrationClosesAt) {
          const regStart = toMidnight(new Date(t.registrationOpensAt));
          const regEnd   = toMidnight(new Date(t.registrationClosesAt));
          if (cellTs >= regStart.getTime() && cellTs <= regEnd.getTime()) {
            const isStart = cellTs === regStart.getTime();
            const isEnd   = cellTs === regEnd.getTime();
            bands.push({
              tournamentId: t.id,
              phase: "registration",
              color: t.display.hex,
              isStart: isStart || isWeekStart,
              isEnd:   isEnd   || isWeekEnd,
              isActualStart: isStart,
              isActualEnd: isEnd,
              label: "Registration",
            });
          }
        }

        // ── Auction day (start only) ───────────────────────────────
        if (t.registrationFormat === "AUCTION" && t.auctionStartsAt) {
          const auctionDay = toMidnight(new Date(t.auctionStartsAt));
          if (cellTs === auctionDay.getTime()) {
            bands.push({
              tournamentId: t.id,
              phase: "auction",
              color: "#d946ef",
              isStart: true,
              isEnd: true,
              isActualStart: true,
              isActualEnd: true,
              label: "Auction",
            });
          }
        }

        // ── Tournament band ────────────────────────────────────────
        if (t.startsAt && t.endsAt) {
          const tourStart = toMidnight(new Date(t.startsAt));
          const tourEnd   = toMidnight(new Date(t.endsAt));
          if (cellTs >= tourStart.getTime() && cellTs <= tourEnd.getTime()) {
            const isStart = cellTs === tourStart.getTime();
            const isEnd   = cellTs === tourEnd.getTime();
            bands.push({
              tournamentId: t.id,
              phase: "tournament",
              color: t.display.hex,
              isStart: isStart || isWeekStart,
              isEnd:   isEnd   || isWeekEnd,
              isActualStart: isStart,
              isActualEnd: isEnd,
              label: t.name,
            });
          }
        } else if (t.startsAt && !t.endsAt) {
          // Single-day tournament (no endsAt) — show a dot-band on start day only
          const tourStart = toMidnight(new Date(t.startsAt));
          if (cellTs === tourStart.getTime()) {
            bands.push({
              tournamentId: t.id,
              phase: "tournament",
              color: t.display.hex,
              isStart: true,
              isEnd: true,
              isActualStart: true,
              isActualEnd: true,
              label: t.name,
            });
          }
        }
      }

      return bands;
    });
  }, [cells, displayTournaments]);

  // Active events and phases for the selected date (what is going on on that day)
  const selectedDatePhases = useMemo(() => {
    const toMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const selTs = toMidnight(selectedDate).getTime();

    return displayTournaments
      .filter((t) => {
        let isActive = false;

        // 1. Is registration active?
        if (t.registrationOpensAt && t.registrationClosesAt) {
          const start = toMidnight(new Date(t.registrationOpensAt)).getTime();
          const end = toMidnight(new Date(t.registrationClosesAt)).getTime();
          if (selTs >= start && selTs <= end) isActive = true;
        }

        // 2. Is auction day?
        if (t.registrationFormat === "AUCTION" && t.auctionStartsAt) {
          const auctionDay = toMidnight(new Date(t.auctionStartsAt)).getTime();
          if (selTs === auctionDay) isActive = true;
        }

        // 3. Is tournament active?
        if (t.startsAt) {
          const start = toMidnight(new Date(t.startsAt)).getTime();
          const end = t.endsAt ? toMidnight(new Date(t.endsAt)).getTime() : start;
          if (selTs >= start && selTs <= end) isActive = true;
        }

        return isActive;
      })
      .map((t) => {
        let activePhase: "REGISTRATION" | "AUCTION" | "TOURNAMENT" | "UPCOMING" = "UPCOMING";

        if (t.registrationOpensAt && t.registrationClosesAt) {
          const start = toMidnight(new Date(t.registrationOpensAt)).getTime();
          const end = toMidnight(new Date(t.registrationClosesAt)).getTime();
          if (selTs >= start && selTs <= end) activePhase = "REGISTRATION";
        }

        if (t.registrationFormat === "AUCTION" && t.auctionStartsAt) {
          const auctionDay = toMidnight(new Date(t.auctionStartsAt)).getTime();
          if (selTs === auctionDay) activePhase = "AUCTION";
        }

        if (t.startsAt) {
          const start = toMidnight(new Date(t.startsAt)).getTime();
          const end = t.endsAt ? toMidnight(new Date(t.endsAt)).getTime() : start;
          if (selTs >= start && selTs <= end) activePhase = "TOURNAMENT";
        }

        return {
          ...t,
          activePhase,
        };
      });
  }, [selectedDate, displayTournaments]);

  // Selected month's tournaments (for fallback)
  const currentMonthTournaments = useMemo(() => {
    return displayTournaments.filter((t) => {
      if (!t.startsAt) return false;
      const tDate = new Date(t.startsAt);
      return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    }).sort((a, b) => {
      const timeA = a.startsAt ? new Date(a.startsAt).getTime() : 0;
      const timeB = b.startsAt ? new Date(b.startsAt).getTime() : 0;
      return timeA - timeB;
    });
  }, [currentYear, currentMonth, displayTournaments]);

  // Format month name
  const monthName = useMemo(() => {
    const tempDate = new Date(currentYear, currentMonth, 1);
    return tempDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [currentYear, currentMonth]);

  const weekdays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-start lg:gap-6">
      <div className="mx-auto w-full max-w-[18rem] shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={handleGoToToday}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Today
          </button>
          <div className="flex items-center rounded-full border border-white/10 bg-white/[0.02] p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Previous month"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="min-w-[7.5rem] px-1 text-center font-display text-[10px] font-bold uppercase tracking-widest text-white">
              {monthName}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Next month"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-7 text-center">
          {weekdays.map((day) => (
            <span key={day} className="py-1 text-[9px] font-bold uppercase tracking-wider text-white/35">
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, idx) => {
            const selected = scheduleOpen && isSameDay(cell.date, selectedDate);
            const current = isToday(cell.date);
            const bands = cellBands[idx] ?? [];
            const eventDots = bands.slice(0, 3);
            const accent = bands[0]?.color;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => openScheduleForDate(cell.date)}
                aria-pressed={selected}
                aria-label={`Schedule for ${cell.date.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                })}`}
                className={`relative flex h-7 w-full flex-col items-center justify-center rounded-md transition-colors sm:h-9 ${
                  cell.isCurrentMonth ? "" : "opacity-30"
                } ${
                  selected
                    ? "bg-[var(--color-brand)]/12 ring-1 ring-[var(--color-brand)]"
                    : "hover:bg-white/[0.06]"
                }`}
              >
                {bands.length > 0 && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-lg opacity-40"
                    style={{
                      background: `linear-gradient(to top, ${accent}50 0%, transparent 75%)`,
                    }}
                  />
                )}
                <span
                  className={`relative z-10 font-display text-[10px] font-bold leading-none sm:text-[11px] ${
                    current
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand)] text-black sm:h-6 sm:w-6"
                      : selected
                        ? "text-[var(--color-brand)]"
                        : "text-white"
                  }`}
                >
                  {cell.dayNum}
                </span>
                {eventDots.length > 0 && (
                  <span className="relative z-10 mt-0.5 flex h-1.5 items-center justify-center gap-0.5">
                    {eventDots.map((band) => (
                      <span
                        key={`${band.tournamentId}-${band.phase}`}
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: band.color }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!startWithSchedule && (
          <p className="mt-3 text-center text-[10px] font-medium text-white/35">
            Click a date to see the schedule
          </p>
        )}
      </div>

      <div ref={scheduleRef} className="min-w-0 w-full flex-1">
        <AnimatePresence mode="wait">
          {scheduleOpen ? (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 sm:p-5 lg:min-h-[20rem]"
            >
            <div className="mb-2 border-b border-white/[0.06] pb-2 sm:mb-3 sm:pb-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand)] sm:text-[10px] sm:tracking-[0.25em] sm:font-black">
                {selectedDate.toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>

            <div className="mb-3 hidden rounded-lg border border-white/[0.04] bg-white/[0.02] p-1 sm:flex">
              <button
                type="button"
                onClick={() => setActiveTab("day")}
                className={`flex-1 rounded-md py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all
                  ${activeTab === "day"
                    ? "bg-white/[0.06] text-white shadow-sm"
                    : "text-white/40 hover:text-white/60"
                  }
                `}
              >
                Selected Date
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("month")}
                className={`flex-1 rounded-md py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all
                  ${activeTab === "month"
                    ? "bg-white/[0.06] text-white shadow-sm"
                    : "text-white/40 hover:text-white/60"
                  }
                `}
              >
                Month Schedule
              </button>
            </div>

            {/* Tab Panels */}
            <div className="flex-1 overflow-y-auto pr-1 pt-1 min-h-0">
              <AnimatePresence mode="popLayout">
                {activeTab === "day" ? (
                  selectedDatePhases.length > 0 ? (
                    selectedDatePhases.map((t) => (
                      <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Link
                          href={`/esports/tournaments/${t.slug}`}
                          className="mb-1.5 flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-2 last:mb-0"
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0a1020] ring-1 ring-white/10"
                            style={{ color: t.display.hex }}
                          >
                            <BrandIcon path={t.display.iconPath} title={t.display.game} className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-display text-xs font-bold text-white">
                              {t.name}
                            </span>
                            <span className="block text-[10px] text-white/40">
                              {t.activePhase === "REGISTRATION"
                                ? "Registration"
                                : t.activePhase === "AUCTION"
                                  ? "Auction"
                                  : t.status === "COMPLETED"
                                    ? t.championName ?? "Completed"
                                    : "Match day"}
                            </span>
                          </span>
                        </Link>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      key="empty-day"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-4 text-center"
                    >
                      <p className="text-xs text-white/35">No events on this date.</p>
                    </motion.div>
                  )
                ) : (
                  currentMonthTournaments.length > 0 ? (
                    <motion.div
                      key="month-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                    >
                      {currentMonthTournaments.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (t.startsAt) {
                              openScheduleForDate(new Date(t.startsAt));
                            }
                          }}
                          className="flex items-center justify-between w-full p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10 transition-all text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#0a1020] ring-1 ring-white/10"
                              style={{ color: t.display.hex }}
                            >
                              <BrandIcon path={t.display.iconPath} title={t.display.game} className="h-3 w-3" />
                            </span>
                            <div className="truncate min-w-0">
                              <span className="block font-display text-xs font-bold text-white truncate leading-tight">
                                {t.name}
                              </span>
                              <span className="block text-[8px] text-white/40 font-medium">
                                {new Date(t.startsAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 text-white/50 whitespace-nowrap">
                            {t.status.replace("_", " ")}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty-month"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-4 text-center"
                    >
                      <p className="text-xs text-white/35">No cups this month.</p>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
            </motion.div>
          ) : (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center lg:min-h-[16rem]"
            >
              <p className="text-sm font-medium text-white/70">Pick a date</p>
              <p className="mt-1 max-w-xs text-xs text-white/40">
                Tap a day to see what is on.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
