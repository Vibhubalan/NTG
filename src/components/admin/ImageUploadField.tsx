"use client";

import { useState } from "react";

type Props = {
  label: string;
  prefix?: string;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  /** Called right after a successful upload (e.g. auto-save to DB) */
  onUploadedComplete?: (url: string) => Promise<void>;
  /** Remove the current image and clear stored URL */
  onClear?: () => void | Promise<void>;
  hint?: string;
};

export default function ImageUploadField({
  label,
  prefix = "uploads",
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
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
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
        <div className="relative mb-2 h-24 overflow-hidden rounded-xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt="" className="h-full w-full object-cover" />
          {onClear ? (
            <button
              type="button"
              onClick={() => void onClear()}
              className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-rose-600/90 transition-colors"
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
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
