"use client";

import { useEffect, useRef, useState } from "react";

export const ADMIN_DELETE_CONFIRM_TEXT = "NTGESPORTS";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/80 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-red-500/40";

export default function AdminDeleteConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete permanently",
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const confirmed = typed.trim().toUpperCase() === ADMIN_DELETE_CONFIRM_TEXT;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-delete-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
      />

      <div className="relative w-full max-w-md rounded-[1.25rem] border border-red-500/25 bg-[#0a1020] p-6 shadow-2xl">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-red-400/90">
          Confirm delete
        </p>
        <h2 id="admin-delete-title" className="mt-2 font-display text-xl font-bold text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">{description}</p>

        <div className="mt-5 space-y-2">
          <label className="block text-xs text-white/45">
            Type{" "}
            <span className="font-mono font-semibold text-red-300">{ADMIN_DELETE_CONFIRM_TEXT}</span>{" "}
            to confirm
          </label>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={ADMIN_DELETE_CONFIRM_TEXT}
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
            className={inputClass}
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-full border border-white/15 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/70 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!confirmed || loading}
            onClick={onConfirm}
            className="rounded-full bg-red-600/90 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
