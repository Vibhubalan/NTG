"use client";

import { useEffect, useState } from "react";
import { formatDateOfBirthDisplay } from "@/lib/date-age";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none";

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
    if (!dateOfBirth) return "";
    const [y, m, d] = dateOfBirth.split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
  });

  useEffect(() => {
    if (dateOfBirth && dateOfBirth.includes("-")) {
      const [y, m, d] = dateOfBirth.split("-");
      if (y && m && d) setDisplayDob(`${d}/${m}/${y}`);
    } else if (!dateOfBirth) {
      setDisplayDob("");
    }
  }, [dateOfBirth]);

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
    <section className="space-y-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">Account</p>
      <dl className="space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-6">
          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-white/50">Username</dt>
          <dd className="text-xl font-bold tracking-wide text-white">
            {profile.displayName ?? "N/A"}
          </dd>
        </div>
        {profile.email ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">Email</dt>
            <dd className="text-sm text-white/85">{profile.email}</dd>
          </div>
        ) : null}
        {profile.phone ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">Phone</dt>
            <dd className="text-sm text-white/85">{profile.phone}</dd>
          </div>
        ) : null}
      </dl>

      <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/35">Date of birth (DD/MM/YYYY)</label>
          <input
            type="text"
            value={displayDob}
            onChange={handleDobChange}
            placeholder="DD/MM/YYYY"
            disabled={!!profile.dateOfBirth}
            className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {dateOfBirth && age !== null ? (
            <p className="mt-1.5 text-xs text-white/40">
              Age: {age}
              {formatDateOfBirthDisplay(dateOfBirth)
                ? ` · Born ${formatDateOfBirthDisplay(dateOfBirth)}`
                : null}
            </p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/35">Olympus ID</label>
          <input
            type="text"
            value={olympusId}
            onChange={(e) => onOlympusIdChange(e.target.value)}
            placeholder="Your Olympus ID"
            disabled={!!profile.olympusId}
            className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        </div>
      </div>
    </section>
  );
}
