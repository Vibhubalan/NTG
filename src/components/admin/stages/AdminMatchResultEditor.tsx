"use client";

import { useState } from "react";
import { requireApiJson } from "@/lib/parse-api-json";
import type { StageNode } from "./types";

type Match = NonNullable<StageNode["matches"]>[number];

type Props = {
  slug: string;
  match: Match;
  busy: boolean;
  onSaved: () => void;
  onError: (message: string) => void;
};

export default function AdminMatchResultEditor({
  slug,
  match,
  busy,
  onSaved,
  onError,
}: Props) {
  const a = match.participants.find((p) => p.slot === 0);
  const b = match.participants.find((p) => p.slot === 1);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [winnerSlot, setWinnerSlot] = useState<0 | 1 | null>(
    match.result?.winnerSlot === 0 || match.result?.winnerSlot === 1
      ? (match.result.winnerSlot as 0 | 1)
      : null,
  );
  const [scoreA, setScoreA] = useState(
    match.result?.scoreA != null ? String(match.result.scoreA) : "",
  );
  const [scoreB, setScoreB] = useState(
    match.result?.scoreB != null ? String(match.result.scoreB) : "",
  );
  const [screenshotUrl, setScreenshotUrl] = useState(
    match.result?.screenshotUrl ?? "",
  );

  function toggleWinner(slot: 0 | 1) {
    setWinnerSlot((prev) => (prev === slot ? null : slot));
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("prefix", "match-screenshots");
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await requireApiJson(res);
    setScreenshotUrl(data.url as string);
  }

  async function save() {
    setSaving(true);
    try {
      if (winnerSlot === null) {
        if (!match.result) {
          onError("Pick a winner, or close without saving.");
          return;
        }
        const res = await fetch(
          `/api/admin/tournaments/${slug}/matches/${match.id}/result`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clear: true }),
          },
        );
        await requireApiJson(res);
        setOpen(false);
        onSaved();
        return;
      }

      const aNum = Number(scoreA);
      const bNum = Number(scoreB);
      if (!Number.isFinite(aNum) || !Number.isFinite(bNum)) {
        onError("Enter both scores.");
        return;
      }
      if (aNum < 0 || bNum < 0) {
        onError("Scores cannot be negative.");
        return;
      }
      const winnerScore = winnerSlot === 0 ? aNum : bNum;
      const loserScore = winnerSlot === 0 ? bNum : aNum;
      if (winnerScore <= loserScore) {
        onError("Winning team score must be higher than the losing team.");
        return;
      }
      const res = await fetch(
        `/api/admin/tournaments/${slug}/matches/${match.id}/result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            winnerSlot,
            scoreA: aNum,
            scoreB: bNum,
            screenshotUrl: screenshotUrl || "",
          }),
        },
      );
      await requireApiJson(res);
      setOpen(false);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to save result");
    } finally {
      setSaving(false);
    }
  }

  async function resetResult() {
    if (!match.result) return;
    if (
      !confirm(
        "Reset this match result?\n\nWinner, scores, and screenshot will be cleared. The match can be recorded again.",
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/matches/${match.id}/result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clear: true }),
        },
      );
      await requireApiJson(res);
      setOpen(false);
      setWinnerSlot(null);
      setScoreA("");
      setScoreB("");
      setScreenshotUrl("");
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to reset result");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-black/25 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-xs text-white/70">
          <span className="text-white/40">R{match.roundNumber}</span>{" "}
          {a?.teamLabel ?? "TBD"} vs {b?.teamLabel ?? "TBD"}
          {match.result ? (
            <span className="ml-2 text-emerald-300/80">
              {match.result.scoreSummary ??
                `${match.result.scoreA}-${match.result.scoreB}`}
            </span>
          ) : (
            <span className="ml-2 text-white/30">No result</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || saving}
            onClick={() => {
              setWinnerSlot(
                match.result?.winnerSlot === 0 || match.result?.winnerSlot === 1
                  ? (match.result.winnerSlot as 0 | 1)
                  : null,
              );
              setScoreA(
                match.result?.scoreA != null ? String(match.result.scoreA) : "",
              );
              setScoreB(
                match.result?.scoreB != null ? String(match.result.scoreB) : "",
              );
              setScreenshotUrl(match.result?.screenshotUrl ?? "");
              setOpen((v) => !v);
            }}
            className="cursor-pointer rounded-md bg-cyan-600/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-600/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {open ? "Close" : match.result ? "Edit result" : "Set result"}
          </button>
          {match.result ? (
            <button
              type="button"
              disabled={busy || saving}
              onClick={() => void resetResult()}
              className="cursor-pointer rounded-md bg-rose-600/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-200 hover:bg-rose-600/35 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Resetting…" : "Reset"}
            </button>
          ) : null}
        </div>
      </div>

      {match.result?.screenshotUrl && !open ? (
        <a
          href={match.result.screenshotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-md border border-white/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={match.result.screenshotUrl}
            alt="Result screenshot"
            className="max-h-28 w-full object-contain"
          />
        </a>
      ) : null}

      {open ? (
        <div className="space-y-2 border-t border-white/[0.06] pt-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleWinner(0)}
              className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                winnerSlot === 0
                  ? "bg-emerald-500/25 text-emerald-100"
                  : "bg-white/[0.05] text-white/50"
              }`}
            >
              A wins ({a?.teamLabel ?? "A"})
            </button>
            <button
              type="button"
              onClick={() => toggleWinner(1)}
              className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                winnerSlot === 1
                  ? "bg-emerald-500/25 text-emerald-100"
                  : "bg-white/[0.05] text-white/50"
              }`}
            >
              B wins ({b?.teamLabel ?? "B"})
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="text-white/50">
              Series wins A
              <input
                type="number"
                min={0}
                className="ml-1 w-14 rounded bg-black/40 px-1.5 py-1 text-white ring-1 ring-white/10"
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
              />
            </label>
            <span className="text-white/30">–</span>
            <label className="text-white/50">
              Series wins B
              <input
                type="number"
                min={0}
                className="ml-1 w-14 rounded bg-black/40 px-1.5 py-1 text-white ring-1 ring-white/10"
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
              />
            </label>
            <p className="w-full text-[10px] text-white/35">
              Use map wins (e.g. BO3 → 2–0 or 2–1). Shows on the bracket next to each team.
            </p>
            <label className="cursor-pointer rounded border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
              {screenshotUrl ? "Replace screenshot" : "Upload screenshot"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    void upload(f).catch((err) =>
                      onError(err instanceof Error ? err.message : "Upload failed"),
                    );
                }}
              />
            </label>
            <button
              type="button"
              disabled={saving || busy}
              onClick={() => void save()}
              className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-40"
            >
              {saving
                ? "Saving…"
                : winnerSlot === null && match.result
                  ? "Clear result"
                  : "Save"}
            </button>
          </div>
          {screenshotUrl ? (
            <a
              href={screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block overflow-hidden rounded border border-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt="Screenshot preview"
                className="max-h-24 object-contain"
              />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
