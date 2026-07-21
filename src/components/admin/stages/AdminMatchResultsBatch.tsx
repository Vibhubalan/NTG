"use client";

import { useState } from "react";
import { requireApiJson } from "@/lib/parse-api-json";
import {
  formatLabel,
  gamesFromScores,
  isLikelySeriesScore,
  maxGames,
  primaryScreenshotFromGames,
  resolveMatchFormat,
  winsNeeded,
  type SeriesFormat,
  type SeriesGame,
} from "@/modules/tournaments-leagues/application/stages/series-format";
import type { StageNode } from "./types";

type Match = NonNullable<StageNode["matches"]>[number];

/** Elimination = BO series games; Round Robin / league = literal round scores for RD. */
export type ScoreEntryMode = "series" | "rounds";

type DraftResult = {
  open: boolean;
  games: SeriesGame[];
  uploadingGameIndex: number | null;
  winnerSlot: 0 | 1 | null;
  scoreA: string;
  scoreB: string;
  screenshotUrl: string;
  uploading: boolean;
};

function tally(games: SeriesGame[]) {
  let a = 0;
  let b = 0;
  for (const g of games) {
    if (g.winnerSlot === 0) a += 1;
    else b += 1;
  }
  return { a, b };
}

function seriesComplete(format: SeriesFormat, games: SeriesGame[]) {
  const need = winsNeeded(format);
  const { a, b } = tally(games);
  return a >= need || b >= need;
}

function initGamesFromMatch(match: Match): SeriesGame[] {
  const stored = match.result?.games;
  if (stored && stored.length > 0) {
    return stored.map((x) => ({
      winnerSlot: (x.winnerSlot === 1 ? 1 : 0) as 0 | 1,
      scoreA: x.scoreA ?? null,
      scoreB: x.scoreB ?? null,
      screenshotUrl: x.screenshotUrl?.trim() || null,
    }));
  }
  if (
    match.result &&
    match.result.scoreA != null &&
    match.result.scoreB != null &&
    (match.result.winnerSlot === 0 || match.result.winnerSlot === 1)
  ) {
    const a = match.result.scoreA;
    const b = match.result.scoreB;
    if (isLikelySeriesScore(a, b)) {
      const rebuilt = gamesFromScores(
        a,
        b,
        match.result.winnerSlot as 0 | 1,
      );
      if (match.result.screenshotUrl && rebuilt.length > 0) {
        rebuilt[0] = {
          ...rebuilt[0]!,
          screenshotUrl: match.result.screenshotUrl,
        };
      }
      return rebuilt;
    }
  }
  return [];
}

function initDraft(match: Match): DraftResult {
  return {
    open: false,
    games: initGamesFromMatch(match),
    uploadingGameIndex: null,
    winnerSlot:
      match.result?.winnerSlot === 0 || match.result?.winnerSlot === 1
        ? (match.result.winnerSlot as 0 | 1)
        : null,
    scoreA: match.result?.scoreA != null ? String(match.result.scoreA) : "",
    scoreB: match.result?.scoreB != null ? String(match.result.scoreB) : "",
    screenshotUrl: match.result?.screenshotUrl ?? "",
    uploading: false,
  };
}

function winnersMaxRound(matches: Match[]): number {
  let max = 0;
  for (const m of matches) {
    if (m.bracketSide === "losers" || m.bracketSide === "grand_final") continue;
    if (m.roundNumber > max) max = m.roundNumber;
  }
  return max;
}

function formatForMatch(
  match: Match,
  allMatches: Match[],
  stageFormat: SeriesFormat,
  finalsFormat: SeriesFormat | null,
): SeriesFormat {
  return resolveMatchFormat({
    stageMatchFormat: stageFormat,
    config: finalsFormat ? { finalsMatchFormat: finalsFormat } : {},
    bracketSide: match.bracketSide,
    nextWinnerMatchId: null,
    roundNumber: match.roundNumber,
    winnersMaxRound: winnersMaxRound(allMatches),
  });
}

type Props = {
  slug: string;
  matches: Match[];
  matchFormat: SeriesFormat;
  finalsMatchFormat?: SeriesFormat | null;
  /** `rounds` = Round Robin RD scores; `series` = BO1/BO3/BO5 game winners. */
  scoreEntryMode?: ScoreEntryMode;
  busy: boolean;
  onSaved: () => void;
  onError: (message: string) => void;
};

export default function AdminMatchResultsBatch({
  slug,
  matches,
  matchFormat,
  finalsMatchFormat = null,
  scoreEntryMode = "series",
  busy,
  onSaved,
  onError,
}: Props) {
  const roundsMode = scoreEntryMode === "rounds";
  const [drafts, setDrafts] = useState<Record<string, DraftResult>>(() =>
    Object.fromEntries(matches.map((m) => [m.id, initDraft(m)])),
  );
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  function patchDraft(matchId: string, patch: Partial<DraftResult>) {
    setDrafts((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] ??
          initDraft(matches.find((m) => m.id === matchId)!)),
        ...patch,
      },
    }));
  }

  function openMatch(match: Match) {
    patchDraft(match.id, { ...initDraft(match), open: true });
  }

  function closeMatch(matchId: string) {
    patchDraft(matchId, { open: false });
  }

  const openDrafts = matches.filter((m) => drafts[m.id]?.open);

  async function uploadGameShot(matchId: string, gameIndex: number, file: File) {
    patchDraft(matchId, { uploadingGameIndex: gameIndex });
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("prefix", "match-screenshots");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await requireApiJson(res);
      setDrafts((prev) => {
        const cur =
          prev[matchId] ??
          initDraft(matches.find((m) => m.id === matchId)!);
        return {
          ...prev,
          [matchId]: {
            ...cur,
            games: cur.games.map((g, i) =>
              i === gameIndex
                ? { ...g, screenshotUrl: data.url as string }
                : g,
            ),
            uploadingGameIndex: null,
          },
        };
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload failed");
      patchDraft(matchId, { uploadingGameIndex: null });
    }
  }

  async function uploadMatchShot(matchId: string, file: File) {
    patchDraft(matchId, { uploading: true });
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("prefix", "match-screenshots");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await requireApiJson(res);
      patchDraft(matchId, { screenshotUrl: data.url as string });
    } catch (e) {
      onError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      patchDraft(matchId, { uploading: false });
    }
  }

  async function saveAll() {
    if (openDrafts.length === 0) {
      onError("Open at least one match and fill in the result before saving.");
      return;
    }
    setSaving(true);
    let anyError = false;

    for (const match of openDrafts) {
      const d = drafts[match.id];
      if (!d) continue;
      const label = `${match.participants.find((p) => p.slot === 0)?.teamLabel ?? "A"} vs ${
        match.participants.find((p) => p.slot === 1)?.teamLabel ?? "B"
      }`;

      try {
        if (roundsMode) {
          if (d.winnerSlot === null) {
            if (!match.result) continue;
            const res = await fetch(
              `/api/admin/tournaments/${slug}/matches/${match.id}/result`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clear: true }),
              },
            );
            await requireApiJson(res);
          } else {
            const aNum = Number(d.scoreA);
            const bNum = Number(d.scoreB);
            if (!Number.isFinite(aNum) || !Number.isFinite(bNum)) {
              onError(`${label}: enter both round scores.`);
              anyError = true;
              continue;
            }
            if (aNum < 0 || bNum < 0) {
              onError(`${label}: scores cannot be negative.`);
              anyError = true;
              continue;
            }
            const winnerScore = d.winnerSlot === 0 ? aNum : bNum;
            const loserScore = d.winnerSlot === 0 ? bNum : aNum;
            if (winnerScore <= loserScore) {
              onError(
                `${label}: winning team must have the higher round score.`,
              );
              anyError = true;
              continue;
            }
            const res = await fetch(
              `/api/admin/tournaments/${slug}/matches/${match.id}/result`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  winnerSlot: d.winnerSlot,
                  scoreA: aNum,
                  scoreB: bNum,
                  screenshotUrl: d.screenshotUrl || "",
                }),
              },
            );
            await requireApiJson(res);
          }
        } else {
          const format = formatForMatch(
            match,
            matches,
            matchFormat,
            finalsMatchFormat,
          );
          if (d.games.length === 0) {
            if (!match.result) continue;
            const res = await fetch(
              `/api/admin/tournaments/${slug}/matches/${match.id}/result`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clear: true }),
              },
            );
            await requireApiJson(res);
          } else {
            if (!seriesComplete(format, d.games)) {
              onError(
                `${label}: series incomplete for ${formatLabel(format)}.`,
              );
              anyError = true;
              continue;
            }
            const res = await fetch(
              `/api/admin/tournaments/${slug}/matches/${match.id}/result`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  games: d.games.map((g) => ({
                    winnerSlot: g.winnerSlot,
                    scoreA: g.scoreA ?? null,
                    scoreB: g.scoreB ?? null,
                    screenshotUrl: g.screenshotUrl ?? null,
                  })),
                  screenshotUrl: primaryScreenshotFromGames(d.games) ?? "",
                }),
              },
            );
            await requireApiJson(res);
          }
        }
        patchDraft(match.id, { open: false });
      } catch (e) {
        onError(e instanceof Error ? e.message : "Failed to save result");
        anyError = true;
      }
    }

    setSaving(false);
    if (!anyError) onSaved();
  }

  async function resetMatch(match: Match) {
    if (!match.result) return;
    if (
      !confirm(
        "Reset this match result?\n\nWinner, scores, and screenshots will be cleared.",
      )
    )
      return;
    setResettingId(match.id);
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
      patchDraft(match.id, { ...initDraft({ ...match, result: null }), open: false });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to reset result");
    } finally {
      setResettingId(null);
    }
  }

  return (
    <div className="space-y-2">
      {matches.map((m) => {
        const draft = drafts[m.id] ?? initDraft(m);
        const a = m.participants.find((p) => p.slot === 0);
        const b = m.participants.find((p) => p.slot === 1);
        const isResetting = resettingId === m.id;
        const format = formatForMatch(
          m,
          matches,
          matchFormat,
          finalsMatchFormat,
        );
        const need = winsNeeded(format);
        const max = maxGames(format);
        const { a: winsA, b: winsB } = tally(draft.games);
        const complete = seriesComplete(format, draft.games);
        const canAdd = !complete && draft.games.length < max;

        function setGameWinner(index: number, winnerSlot: 0 | 1) {
          const next = [...draft.games];
          const prev = next[index];
          next[index] = {
            winnerSlot,
            scoreA: prev?.scoreA ?? null,
            scoreB: prev?.scoreB ?? null,
            screenshotUrl: prev?.screenshotUrl ?? null,
          };
          let sa = 0;
          let sb = 0;
          let cut = next.length;
          for (let i = 0; i < next.length; i++) {
            if (next[i]!.winnerSlot === 0) sa += 1;
            else sb += 1;
            if (sa >= need || sb >= need) {
              cut = i + 1;
              break;
            }
          }
          patchDraft(m.id, { games: next.slice(0, cut) });
        }

        function addGame(winnerSlot: 0 | 1) {
          if (!canAdd) return;
          patchDraft(m.id, {
            games: [...draft.games, { winnerSlot, screenshotUrl: null }],
          });
        }

        const proofThumbs =
          m.result?.games?.filter((g) => g.screenshotUrl) ??
          (m.result?.screenshotUrl
            ? [{ screenshotUrl: m.result.screenshotUrl }]
            : []);

        return (
          <div
            key={m.id}
            className={`space-y-2 rounded-lg bg-black/25 px-3 py-2 transition-colors ${
              draft.open ? "ring-1 ring-cyan-500/20" : ""
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 text-xs text-white/70">
                {a?.teamLabel ?? "TBD"} vs {b?.teamLabel ?? "TBD"}
                {!roundsMode ? (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-white/35">
                    {format}
                  </span>
                ) : (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-white/35">
                    Rounds
                  </span>
                )}
                {m.result ? (
                  <span className="ml-2 text-emerald-300/80">
                    {m.result.scoreSummary ??
                      `${m.result.scoreA}-${m.result.scoreB}`}
                  </span>
                ) : (
                  <span className="ml-2 text-white/30">No result</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy || saving || isResetting}
                  onClick={() =>
                    draft.open ? closeMatch(m.id) : openMatch(m)
                  }
                  className="cursor-pointer rounded-md bg-cyan-600/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-600/35 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {draft.open ? "Close" : m.result ? "Edit result" : "Set result"}
                </button>
                {m.result ? (
                  <button
                    type="button"
                    disabled={busy || saving || isResetting}
                    onClick={() => void resetMatch(m)}
                    className="cursor-pointer rounded-md bg-rose-600/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-200 hover:bg-rose-600/35 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isResetting ? "Resetting…" : "Reset"}
                  </button>
                ) : null}
              </div>
            </div>

            {!draft.open && proofThumbs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {proofThumbs.map((row, i) =>
                  row.screenshotUrl ? (
                    <a
                      key={i}
                      href={row.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-md border border-white/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.screenshotUrl}
                        alt={`Proof ${i + 1}`}
                        className="h-16 w-28 object-cover"
                      />
                    </a>
                  ) : null,
                )}
              </div>
            ) : null}

            {draft.open && roundsMode ? (
              <div className="space-y-2 border-t border-white/[0.06] pt-2">
                <p className="text-[11px] text-white/45">
                  Pick the winner, then enter <span className="text-white/70">round scores</span>{" "}
                  (used for RD / standings) — e.g. 13–7 or 3–1.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      patchDraft(m.id, {
                        winnerSlot: draft.winnerSlot === 0 ? null : 0,
                      })
                    }
                    className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                      draft.winnerSlot === 0
                        ? "bg-emerald-500/25 text-emerald-100"
                        : "bg-white/[0.05] text-white/50"
                    }`}
                  >
                    A wins ({a?.teamLabel ?? "A"})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      patchDraft(m.id, {
                        winnerSlot: draft.winnerSlot === 1 ? null : 1,
                      })
                    }
                    className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                      draft.winnerSlot === 1
                        ? "bg-emerald-500/25 text-emerald-100"
                        : "bg-white/[0.05] text-white/50"
                    }`}
                  >
                    B wins ({b?.teamLabel ?? "B"})
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="text-white/50">
                    Rounds A
                    <input
                      type="number"
                      min={0}
                      className="ml-1 w-14 rounded bg-black/40 px-1.5 py-1 text-white ring-1 ring-white/10"
                      value={draft.scoreA}
                      onChange={(e) =>
                        patchDraft(m.id, { scoreA: e.target.value })
                      }
                    />
                  </label>
                  <span className="text-white/30">–</span>
                  <label className="text-white/50">
                    Rounds B
                    <input
                      type="number"
                      min={0}
                      className="ml-1 w-14 rounded bg-black/40 px-1.5 py-1 text-white ring-1 ring-white/10"
                      value={draft.scoreB}
                      onChange={(e) =>
                        patchDraft(m.id, { scoreB: e.target.value })
                      }
                    />
                  </label>
                  <label className="cursor-pointer rounded border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                    {draft.uploading
                      ? "Uploading…"
                      : draft.screenshotUrl
                        ? "Replace shot"
                        : "Upload shot"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={draft.uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadMatchShot(m.id, f);
                      }}
                    />
                  </label>
                </div>
                {draft.screenshotUrl ? (
                  <a
                    href={draft.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block overflow-hidden rounded border border-white/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.screenshotUrl}
                      alt="Screenshot preview"
                      className="max-h-24 object-contain"
                    />
                  </a>
                ) : null}
                {draft.winnerSlot === null && m.result ? (
                  <p className="text-[11px] text-amber-200/70">
                    No winner selected — Save All will clear this result.
                  </p>
                ) : null}
              </div>
            ) : null}

            {draft.open && !roundsMode ? (
              <div className="space-y-2 border-t border-white/[0.06] pt-2">
                <p className="text-[11px] text-white/45">
                  {formatLabel(format)} — pick each game winner
                  {need > 1 ? ` until someone reaches ${need}` : ""}. Series:{" "}
                  <span className="font-semibold text-white/80">
                    {winsA}–{winsB}
                  </span>
                </p>

                <div className="space-y-2">
                  {draft.games.map((game, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-2 rounded-md bg-black/30 px-2.5 py-2"
                    >
                      <span className="w-14 text-[10px] font-bold uppercase tracking-wider text-white/40">
                        Game {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setGameWinner(i, 0)}
                        className={`cursor-pointer rounded-md border px-2 py-1 text-[11px] ${
                          game.winnerSlot === 0
                            ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                            : "border-white/10 text-white/55"
                        }`}
                      >
                        {a?.teamLabel ?? "A"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setGameWinner(i, 1)}
                        className={`cursor-pointer rounded-md border px-2 py-1 text-[11px] ${
                          game.winnerSlot === 1
                            ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                            : "border-white/10 text-white/55"
                        }`}
                      >
                        {b?.teamLabel ?? "B"}
                      </button>
                      <label className="cursor-pointer rounded-md border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70">
                        {draft.uploadingGameIndex === i
                          ? "Uploading…"
                          : game.screenshotUrl
                            ? "Replace shot"
                            : "Upload shot"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={draft.uploadingGameIndex === i}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadGameShot(m.id, i, f);
                          }}
                        />
                      </label>
                      {game.screenshotUrl ? (
                        <a
                          href={game.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-300/80 hover:text-emerald-200"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-[10px] text-white/30">
                          Optional
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          patchDraft(m.id, {
                            games: draft.games.filter((_, j) => j !== i),
                          })
                        }
                        className="ml-auto cursor-pointer text-[10px] uppercase tracking-wider text-white/35 hover:text-rose-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {canAdd ? (
                  <div className="rounded-md border border-dashed border-white/15 px-3 py-2.5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                      Add game {draft.games.length + 1} winner
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => addGame(0)}
                        className="cursor-pointer rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/70 hover:border-cyan-500/40 hover:text-cyan-100"
                      >
                        {a?.teamLabel ?? "A"} won
                      </button>
                      <button
                        type="button"
                        onClick={() => addGame(1)}
                        className="cursor-pointer rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/70 hover:border-cyan-500/40 hover:text-cyan-100"
                      >
                        {b?.teamLabel ?? "B"} won
                      </button>
                    </div>
                  </div>
                ) : complete ? (
                  <p className="text-[11px] text-emerald-200/80">
                    Series decided {winsA}–{winsB}. Save when ready.
                  </p>
                ) : draft.games.length === 0 && m.result ? (
                  <p className="text-[11px] text-amber-200/70">
                    No games listed — Save All will clear this result.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      {openDrafts.length > 0 ? (
        <div className="sticky bottom-0 mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-[#0a1020]/90 px-4 py-3 backdrop-blur-sm">
          <p className="text-[11px] text-white/40">
            {openDrafts.length} match{openDrafts.length !== 1 ? "es" : ""}{" "}
            ready to save
          </p>
          <button
            type="button"
            disabled={saving || busy}
            onClick={() => void saveAll()}
            className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : `Save all (${openDrafts.length})`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
