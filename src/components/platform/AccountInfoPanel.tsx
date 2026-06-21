"use client";

import { useEffect, useState } from "react";
import { formatDateOfBirthDisplay } from "@/lib/date-age";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#070b19]/60 px-4 py-2.5 pl-11 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/50 focus:ring-1 focus:ring-[var(--color-brand)]/30 focus:outline-none transition-all duration-300";

type AccountProfile = {
  displayName: string | null;
  dateOfBirth: string | null;
  olympusId: string | null;
  email: string | null;
  phone: string | null;
};

type AccountInfoPanelProps = {
  profile: AccountProfile;
  dateOfBirth: string;
  olympusId: string;
  age: number | null;
  onDateOfBirthChange: (value: string) => void;
  onOlympusIdChange: (value: string) => void;
};

export default function AccountInfoPanel({
  profile,
  dateOfBirth,
  olympusId,
  age,
  onDateOfBirthChange,
  onOlympusIdChange,
}: AccountInfoPanelProps) {
  const [displayDob, setDisplayDob] = useState(() => {
    if (!profile.dateOfBirth) return "";
    const [y, m, d] = profile.dateOfBirth.split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  });

  useEffect(() => {
    if (profile.dateOfBirth) {
      const [y, m, d] = profile.dateOfBirth.split("-");
      if (y && m && d) setDisplayDob(`${d}/${m}/${y}`);
    } else {
      setDisplayDob("");
    }
  }, [profile.dateOfBirth]);

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    const digits = rawDigits.slice(0, 8);
    
    let formatted = digits;
    if (digits.length >= 5) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length >= 3) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else if (e.target.value.endsWith("/") && digits.length === 2) {
      formatted = `${digits}/`;
    } else if (e.target.value.endsWith("/") && digits.length === 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/`;
    }
    
    setDisplayDob(formatted);

    if (digits.length === 8) {
      const d = digits.slice(0, 2);
      const m = digits.slice(2, 4);
      const y = digits.slice(4, 8);
      onDateOfBirthChange(`${y}-${m}-${d}`);
    } else {
      onDateOfBirthChange("");
    }
  };

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.02] glass-strong p-6 space-y-6">
      <div className="border-b border-white/[0.06] pb-4">
        <h3 className="font-display text-lg font-semibold text-white">Personal Information</h3>
        <p className="text-xs text-white/45 mt-1">Manage your basic account identity and age verification.</p>
      </div>

      <div className="space-y-3">
        {/* Username Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand)]/10 text-[var(--color-brand)]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Username</p>
            <p className="text-base font-semibold text-white mt-0.5">{profile.displayName ?? "N/A"}</p>
          </div>
        </div>

        {/* Email Card */}
        {profile.email && (
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Email</p>
              <p className="text-sm font-medium text-white/80 mt-0.5 truncate">{profile.email}</p>
            </div>
          </div>
        )}

        {/* Phone Card */}
        {profile.phone && (
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Phone</p>
              <p className="text-sm font-medium text-white/80 mt-0.5">{profile.phone}</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-white/[0.06] pt-5">
        {/* Date of Birth Input */}
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-white/35">
            Date of birth (DD/MM/YYYY)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/30">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="text"
              value={displayDob}
              onChange={handleDobChange}
              placeholder="DD/MM/YYYY"
              disabled={!!profile.dateOfBirth}
              className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-white/[0.01]`}
            />
          </div>
          {dateOfBirth && age !== null ? (
            <p className="mt-2 text-xs text-white/40 flex items-center gap-1.5 pl-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] animate-pulse" />
              Age: {age}
              {formatDateOfBirthDisplay(dateOfBirth)
                ? ` · Born ${formatDateOfBirthDisplay(dateOfBirth)}`
                : null}
            </p>
          ) : null}
        </div>

        {/* Olympus ID Input */}
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-white/35">
            Olympus ID
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/30">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 4 .667 4 2V15H5v-1c0-1.333 2.667-2 4-2z" />
              </svg>
            </div>
            <input
              type="text"
              value={olympusId}
              onChange={(e) => onOlympusIdChange(e.target.value)}
              placeholder="Your Olympus ID"
              disabled={!!profile.olympusId}
              className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-white/[0.01]`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
