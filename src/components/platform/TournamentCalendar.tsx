"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BrandIcon from "@/components/ui/BrandIcon";
import StatusBadge from "@/components/platform/ui/StatusBadge";
import { toTournamentDisplay } from "@/lib/tournament-display";
import type { TournamentPreview } from "@core/contracts";

type DisplayTournament = TournamentPreview & {
  display: ReturnType<typeof toTournamentDisplay>;
};

type Props = {
  tournaments: TournamentPreview[];
};

type CalendarCell = {
  date: Date;
  isCurrentMonth: boolean;
  dayNum: number;
  tournaments: DisplayTournament[];
};

export default function TournamentCalendar({ tournaments }: Props) {
  // Convert tournaments to display structure
  const displayTournaments = useMemo(() => {
    return tournaments.map((t) => ({
      ...t,
      display: toTournamentDisplay(t),
    }));
  }, [tournaments]);

  // Determine initial date:
  // 1. Closest ongoing/upcoming tournament
  // 2. Most recent completed tournament
  // 3. Current system date
  const initialDate = useMemo(() => {
    const active = displayTournaments.find(
      (t) =>
        t.status === "IN_PROGRESS" ||
        t.status === "REGISTRATION_OPEN" ||
        t.status === "UPCOMING"
    );
    if (active?.startsAt) return new Date(active.startsAt);

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
  }, [displayTournaments]);

  const [currentYear, setCurrentYear] = useState(() => initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(() => initialDate);

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
  };

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

  // Selected date's tournaments
  const selectedDateTournaments = useMemo(() => {
    return getTournamentsForDate(selectedDate);
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

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="scroll-mt-24 rounded-[2rem] border border-white/[0.06] bg-[#0A0A0A]/40 p-4 sm:p-8 backdrop-blur-md">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Competitive Schedule</h2>
          <p className="mt-1 text-sm text-white/40">Keep track of ongoing, upcoming, and completed tournament stages</p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center justify-between gap-3 w-full sm:w-auto sm:justify-start">
          <button
            type="button"
            onClick={handleGoToToday}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 sm:px-4 sm:py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/80 transition-all hover:bg-white/10 hover:text-white"
          >
            Today
          </button>
          <div className="flex items-center rounded-full border border-white/10 bg-white/[0.02] p-0.5 sm:p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-white/60 transition-all hover:bg-white/5 hover:text-white"
              aria-label="Previous Month"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="px-1.5 sm:px-3 font-display text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white min-w-[90px] sm:min-w-[120px] text-center">
              {monthName}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-white/60 transition-all hover:bg-white/5 hover:text-white"
              aria-label="Next Month"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid + Sidebar Container */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Calendar Grid (8 Cols on large screens) */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-2">
            {weekdays.map((day) => (
              <span key={day} className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-white/35 py-2">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {cells.map((cell, idx) => {
              const selected = isSameDay(cell.date, selectedDate);
              const current = isToday(cell.date);
              const hasTournaments = cell.tournaments.length > 0;
              const firstT = cell.tournaments[0];
              const glowColor = hasTournaments ? firstT.display.hex : "";

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(cell.date)}
                  className={`group relative flex aspect-square flex-col justify-between rounded-xl border p-1 sm:p-2 transition-all duration-300 text-left cursor-pointer min-w-0 overflow-hidden
                    ${cell.isCurrentMonth ? "bg-white/[0.02]" : "bg-transparent opacity-30"}
                    ${
                      selected
                        ? "border-[var(--color-brand)] bg-white/[0.04] shadow-[0_0_20px_rgba(94,234,212,0.12)] z-10"
                        : hasTournaments
                          ? "border-white/[0.08]"
                          : "border-white/[0.03] hover:border-white/15"
                    }
                  `}
                  style={
                    {
                      "--glow-color": glowColor,
                      borderColor: selected ? "var(--color-brand)" : hasTournaments && !selected ? `${glowColor}30` : undefined,
                    } as React.CSSProperties
                  }
                >
                  {/* Glow overlay for tournament days */}
                  {hasTournaments && !selected && (
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at center, ${glowColor}15 0%, transparent 70%)`,
                        boxShadow: `0 0 15px ${glowColor}10`,
                      }}
                    />
                  )}

                  {/* Day Number Header */}
                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    <span
                      className={`font-display text-xs font-bold leading-none ${
                        current
                          ? "rounded-md bg-[var(--color-brand)]/15 px-1.5 py-1 text-[var(--color-brand)] ring-1 ring-[var(--color-brand)]/30"
                          : selected
                            ? "text-[var(--color-brand)]"
                            : "text-white"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Small dot indicators for status if multiple (Desktop only) */}
                    {hasTournaments && cell.tournaments.length > 1 && (
                      <span className="hidden sm:flex gap-0.5 shrink-0">
                        {cell.tournaments.map((t) => (
                          <span
                            key={t.id}
                            className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full"
                            style={{ backgroundColor: t.display.hex }}
                          />
                        ))}
                      </span>
                    )}
                  </div>

                  {/* Tournament Content inside Cell */}
                  {hasTournaments && (
                    <div className="mt-auto w-full">
                      {/* Desktop/Tablet view: show Brand Icon */}
                      <div className="hidden sm:flex items-center justify-between gap-1 w-full min-w-0">
                        <span
                          className="flex h-4 w-4 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded bg-[#0a1020]/80 ring-1 ring-white/10"
                          style={{ color: firstT.display.hex }}
                        >
                          <BrandIcon path={firstT.display.iconPath} title={firstT.display.game} className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </span>

                        {/* Brief tournament label (first 8 chars) */}
                        <span className="hidden sm:block truncate text-[8px] font-black uppercase tracking-wider text-white/50 w-full min-w-0 text-right leading-none">
                          {firstT.name.length > 12 ? firstT.name.substring(0, 10) + ".." : firstT.name}
                        </span>
                      </div>

                      {/* Mobile view: show clean colored dots at the bottom instead of logo */}
                      <div className="flex sm:hidden justify-start items-center gap-0.5 pl-0.5 py-0.5">
                        {cell.tournaments.map((t) => (
                          <span
                            key={t.id}
                            className="h-1 w-1 rounded-full"
                            style={{ backgroundColor: t.display.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar/Panel Details (4 Cols on large screens) */}
        <div className="lg:col-span-4 flex flex-col min-w-0">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E0E0E]/60 p-5 shadow-xl backdrop-blur-md flex flex-col flex-1 h-full min-h-[350px]">
            {/* Selected Date Title */}
            <div className="border-b border-white/[0.06] pb-3 mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-brand)]">Selected Date</p>
              <h3 className="font-display text-base font-bold text-white mt-1">
                {selectedDate.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
            </div>

            {/* Selected Tournaments List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pt-1 min-h-0">
              <AnimatePresence mode="popLayout">
                {selectedDateTournaments.length > 0 ? (
                  selectedDateTournaments.map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="group relative flex flex-col gap-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 shadow transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--game-color)]/30 hover:shadow-[0_0_20px_var(--game-color-glow)]"
                      style={
                        {
                          "--game-color": t.display.hex,
                          "--game-color-glow": `${t.display.hex}15`,
                        } as React.CSSProperties
                      }
                    >
                      {/* Game Info */}
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0a1020] ring-1 ring-white/10"
                          style={{ color: t.display.hex }}
                        >
                          <BrandIcon path={t.display.iconPath} title={t.display.game} className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-white leading-none whitespace-nowrap">
                            {t.display.game}
                          </span>
                          {t.display.format && (
                            <span className="block text-[9px] text-white/40 font-semibold uppercase tracking-wider mt-1 whitespace-nowrap">
                              {t.display.format}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge (Centered) */}
                      <div className="flex justify-center w-full">
                        <StatusBadge status={t.status} />
                      </div>

                      {/* Name */}
                      <div>
                        <h4 className="font-display text-sm font-black text-white leading-tight">
                          {t.name}
                        </h4>
                      </div>

                      {/* Winners / Date info */}
                      {t.status === "COMPLETED" && t.championName ? (
                        <div className="rounded-lg bg-amber-500/[0.04] border border-amber-500/10 p-2 text-center">
                          <p className="text-[8px] font-black uppercase tracking-wider text-amber-400">Cup Champions</p>
                          <p className="mt-0.5 text-xs font-black text-white truncate">🏆 {t.championName}</p>
                        </div>
                      ) : (
                        <div className="text-[10px] text-white/50">
                          Starts at: <span className="font-semibold text-white/80">
                            {new Date(t.startsAt!).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}

                      {/* Details Link */}
                      <Link
                        href={`/esports/tournaments/${t.slug}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-white/95 transition-all hover:bg-white/10 hover:text-white"
                      >
                        {t.status === "COMPLETED" ? "View Bracket" : t.status === "REGISTRATION_OPEN" ? "Register Now" : "Details"}
                        <span>→</span>
                      </Link>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col pt-[2px] pb-[18px] text-center"
                  >
                    <p className="text-xs text-white/35">No matches scheduled for this date.</p>

                    {/* Month Schedule Fallback */}
                    {currentMonthTournaments.length > 0 ? (
                      <div className="mt-[18px] text-left">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-[9px] border-t border-white/[0.06] pt-3">
                          All Cups in {monthName}
                        </p>
                        <div className="space-y-2">
                          {currentMonthTournaments.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => t.startsAt && setSelectedDate(new Date(t.startsAt))}
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
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-white/20 mt-4 italic">No tournaments in this month.</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
