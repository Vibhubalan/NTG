"use client";

import { useState } from "react";

type Props = {
  label: string;
  prefix?: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  onUploadedComplete?: (url: string) => Promise<void>;
  /** Remove the current rulebook and clear stored URL */
  onClear?: () => void | Promise<void>;
  hint?: string;
};

export default function RulebookUploadField({
  label,
  prefix = "tournaments/rulebooks",
  currentUrl,
  onUploaded,
  onUploadedComplete,
  onClear,
  hint,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("prefix", prefix);

    try {
      const res = await fetch("/api/admin/upload-rulebook", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      onUploaded(data.url);
      if (onUploadedComplete) {
        await onUploadedComplete(data.url);
      }
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">
        {label}
      </label>
      {currentUrl ? (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-amber-200/90 hover:bg-white/[0.05]"
          >
            View current rulebook
          </a>
          {onClear ? (
            <button
              type="button"
              onClick={() => void onClear()}
              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
      <input
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        disabled={uploading}
        onChange={handleChange}
        className="block w-full text-xs text-white/50 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/20 file:px-3 file:py-2 file:text-[11px] file:font-semibold file:uppercase file:tracking-wider file:text-amber-200"
      />
      {hint ? <p className="text-xs text-white/40">{hint}</p> : null}
      {uploading ? <p className="text-xs text-white/40">Uploading…</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
