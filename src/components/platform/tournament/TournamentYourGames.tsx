"use client";

import { useCallback, useEffect, useState } from "react";
import { requireApiJson } from "@/lib/parse-api-json";
import type { MyGameView } from "@/modules/tournaments-leagues/application/stages/my-games.types";
import {
  allGamesHaveScreenshots,
  maxGames,
  primaryScreenshotFromGames,
  winsNeeded,
  type SeriesGame,
} from "@/modules/tournaments-leagues/application/stages/series-format";

type ResultForm = {
  games: SeriesGame[];
  /** Round Robin / non-elim: literal round scores. */
  winnerSlot: 0 | 1 | null;
  scoreA: string;
  scoreB: string;
  screenshotUrl: string | null;
};

type Props = {
  slug: string;
  isLoggedIn: boolean;
  initialData?: { games: MyGameView[]; hasTeam: boolean } | null;
};

function formatWhen(iso: string | null) {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function schedulePhase(g: MyGameView): "unset" | "pending" | "confirmed" | "done" {
  if (g.result) return "done";
  if (g.scheduleStatus === "CONFIRMED") return "confirmed";
  if (g.scheduledAt || g.scheduleStatus === "PENDING_CONFIRM") return "pending";
  return "unset";
}

function ScheduleStatusBadge({ g }: { g: MyGameView }) {
  const phase = schedulePhase(g);
  if (phase === "done") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-500/25">
        Result in
      </span>
    );
  }
  if (phase === "confirmed") {
    return (
      <span className="inline-flex items-center rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200 ring-1 ring-cyan-500/30">
        Confirmed
      </span>
    );
  }
  if (phase === "pending") {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100 ring-1 ring-amber-500/30">
        Pending confirmation
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/45 ring-1 ring-white/10">
      Time not set
    </span>
  );
}

function tally(games: SeriesGame[]) {
  let a = 0;
  let b = 0;
  for (const g of games) {
    if (g.winnerSlot === 0) a += 1;
    else b += 1;
  }
  return { a, b };
}

function seriesComplete(format: string | undefined, games: SeriesGame[]) {
  const need = winsNeeded(format);
  const { a, b } = tally(games);
  return a >= need || b >= need;
}

function defaultForm(_g: MyGameView): ResultForm {
  return {
    games: [],
    winnerSlot: null,
    scoreA: "",
    scoreB: "",
    screenshotUrl: null,
  };
}

export default function TournamentYourGames({
  slug,
  isLoggedIn,
  initialData = null,
}: Props) {
  const [games, setGames] = useState<MyGameView[]>(initialData?.games ?? []);
  const [hasTeam, setHasTeam] = useState(Boolean(initialData?.hasTeam));
  const [loading, setLoading] = useState(isLoggedIn && !initialData);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proposeAt, setProposeAt] = useState<Record<string, string>>({});
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState<Record<string, ResultForm>>({});
  const [uploadingShot, setUploadingShot] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tournaments/${slug}/my-games`);
        const data = await requireApiJson(res);
        setGames((data.games as MyGameView[] | undefined) ?? []);
        setHasTeam(Boolean(data.hasTeam));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load games");
      } finally {
        setLoading(false);
      }
    },
    [slug, isLoggedIn],
  );

  useEffect(() => {
    if (!isLoggedIn) return;
    // Instant paint from SSR; refresh in background without a loading flash.
    void load({ silent: Boolean(initialData) });
  }, [load, isLoggedIn, initialData]);

  function formFor(g: MyGameView): ResultForm {
    return resultForm[g.matchId] ?? defaultForm(g);
  }

  function patchForm(matchId: string, base: ResultForm, patch: Partial<ResultForm>) {
    setResultForm((prev) => ({
      ...prev,
      [matchId]: { ...base, ...patch },
    }));
  }

  async function confirm(matchId: string) {
    setBusyId(matchId);
    setError(null);
    try {
      const res = await fetch(
        `/api/tournaments/${slug}/matches/${matchId}/schedule/confirm`,
        { method: "POST" },
      );
      await requireApiJson(res);
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusyId(null);
    }
  }

  async function propose(matchId: string) {
    const when = proposeAt[matchId];
    if (!when) {
      setError("Pick a date and time to propose.");
      return;
    }
    setBusyId(matchId);
    setError(null);
    try {
      const res = await fetch(
        `/api/tournaments/${slug}/matches/${matchId}/schedule/propose`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: new Date(when).toISOString(),
          }),
        },
      );
      await requireApiJson(res);
      // Collapse the edit form on success
      setEditingScheduleId(null);
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Propose failed");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadMatchScreenshot(
    matchId: string,
    file: File,
    base: ResultForm,
  ) {
    setUploadingShot(matchId);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/tournaments/${slug}/matches/upload-screenshot`, {
        method: "POST",
        body: fd,
      });
      const data = await requireApiJson(res);
      patchForm(matchId, base, { screenshotUrl: data.url as string });
    } finally {
      setUploadingShot(null);
    }
  }

  async function uploadGameScreenshot(
    matchId: string,
    gameIndex: number,
    file: File,
    base: ResultForm,
  ) {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch(`/api/tournaments/${slug}/matches/upload-screenshot`, {
      method: "POST",
      body: fd,
    });
    const data = await requireApiJson(res);
    const next = base.games.map((g, i) =>
      i === gameIndex
        ? { ...g, screenshotUrl: data.url as string }
        : g,
    );
    patchForm(matchId, base, { games: next });
  }

  async function submitResult(matchId: string, form: ResultForm) {
    const g = games.find((x) => x.matchId === matchId);
    if (!g) return;

    const roundsMode = g.scoreEntryMode === "rounds";

    if (roundsMode) {
      if (form.winnerSlot !== 0 && form.winnerSlot !== 1) {
        setError("Pick the winning team.");
        return;
      }
      const aNum = Number(form.scoreA);
      const bNum = Number(form.scoreB);
      if (!Number.isFinite(aNum) || !Number.isFinite(bNum)) {
        setError("Enter both round scores.");
        return;
      }
      if (aNum < 0 || bNum < 0) {
        setError("Scores cannot be negative.");
        return;
      }
      const winnerScore = form.winnerSlot === 0 ? aNum : bNum;
      const loserScore = form.winnerSlot === 0 ? bNum : aNum;
      if (winnerScore <= loserScore) {
        setError("Winning team must have the higher round score.");
        return;
      }
      if (!form.screenshotUrl?.trim()) {
        setError("Upload a screenshot before submitting.");
        return;
      }
    } else {
      if (!seriesComplete(g.matchFormat, form.games)) {
        setError(
          `Series incomplete — ${g.formatLabel ?? g.matchFormat}: keep adding game winners until someone reaches ${winsNeeded(g.matchFormat)}.`,
        );
        return;
      }
      if (!allGamesHaveScreenshots(form.games)) {
        setError("Upload a screenshot for each game before submitting.");
        return;
      }
    }

    setBusyId(matchId);
    setError(null);
    try {
      const body = roundsMode
        ? {
            winnerSlot: form.winnerSlot,
            scoreA: Number(form.scoreA),
            scoreB: Number(form.scoreB),
            screenshotUrl: form.screenshotUrl,
          }
        : {
            games: form.games.map((row) => ({
              winnerSlot: row.winnerSlot,
              scoreA: row.scoreA ?? null,
              scoreB: row.scoreB ?? null,
              screenshotUrl: row.screenshotUrl,
            })),
            screenshotUrl: primaryScreenshotFromGames(form.games),
          };

      const res = await fetch(
        `/api/tournaments/${slug}/matches/${matchId}/result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      await requireApiJson(res);
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
        <p className="text-sm text-white/50">Log in to see and manage your team&apos;s games.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-white/50">Loading your games…</p>;
  }

  if (!hasTeam) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
        <p className="text-sm text-white/50">
          You&apos;re not on a team in this cup yet — Your Games will appear once you&apos;re rostered.
        </p>
      </div>
    );
  }

  const stageDeadlines = [
    ...new Map(
      games
        .filter((g) => g.stageFinishesAt)
        .map((g) => [g.stageId, { name: g.stageName, at: g.stageFinishesAt! }]),
    ).values(),
  ];

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {stageDeadlines.length > 0 ? (
        <div className="rounded-2xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300 sm:text-sm">
            Stage deadlines
          </p>
          <p className="mt-1 text-sm text-amber-100/70">
            Finish all games in the stage before this time.
          </p>
          <ul className="mt-4 space-y-3">
            {stageDeadlines.map((s) => (
              <li key={s.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-lg font-bold text-white sm:text-xl">
                  {s.name}
                </span>
                <span className="text-base font-semibold text-amber-100 sm:text-lg">
                  Finish by {formatWhen(s.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-sm text-white/50">No matches for your team yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {games.map((g) => {
            const form = formFor(g);
            const showResultForm = g.canSubmitResult;
            const roundsMode = (g.scoreEntryMode ?? "series") === "rounds";
            const phase = schedulePhase(g);

            return (
              <li
                key={g.matchId}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                        {g.stageName}
                      </p>
                      <span className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/55 ring-1 ring-white/10">
                        {roundsMode ? "Rounds" : (g.matchFormat ?? "BO1")}
                      </span>
                      <ScheduleStatusBadge g={g} />
                    </div>
                    <p className="mt-1 font-display text-lg font-bold text-white">
                      {g.myTeamName}{" "}
                      <span className="text-white/30">vs</span> {g.opponentTeamName}
                    </p>

                    {phase === "pending" ? (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
                            Proposed kickoff
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-white">
                            {formatWhen(g.scheduledAt)}
                          </p>
                          <p className="mt-1.5 text-[11px] text-white/50">
                            {g.iConfirmed ? (
                              <span className="text-emerald-300/90">You confirmed</span>
                            ) : (
                              <span className="text-amber-200/80">Waiting for your confirm</span>
                            )}
                            <span className="text-white/25"> · </span>
                            {g.opponentConfirmed ? (
                              <span className="text-emerald-300/90">Opponent confirmed</span>
                            ) : (
                              <span className="text-amber-200/80">Opponent pending</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {phase === "confirmed" || phase === "done" ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/70">
                            {roundsMode || (g.matchFormat ?? "BO1") === "BO1"
                              ? "Kickoff"
                              : "Series start"}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-white">
                            {formatWhen(g.scheduledAt)}
                          </p>
                          {!roundsMode && (g.matchFormat ?? "BO1") !== "BO1" ? (
                            <p className="mt-1 text-[11px] text-white/45">
                              Games are back-to-back from this time
                            </p>
                          ) : null}
                        </div>
                        <div
                          className={`rounded-xl border px-3 py-2.5 ${
                            g.resultOverdue
                              ? "border-rose-500/30 bg-rose-500/10"
                              : "border-white/10 bg-white/[0.03]"
                          }`}
                        >
                          <p
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              g.resultOverdue ? "text-rose-200/90" : "text-white/40"
                            }`}
                          >
                            Result deadline
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-white">
                            {g.resultDeadlineAt
                              ? formatWhen(g.resultDeadlineAt)
                              : "After match"}
                          </p>
                          {g.resultOverdue && !g.result ? (
                            <p className="mt-1 text-[11px] font-medium text-rose-200">
                              Overdue — submit or ask an admin
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {phase === "unset" ? (
                      <p className="mt-2 text-xs text-white/45">
                        Pick a kickoff time below so both teams can confirm.
                      </p>
                    ) : null}
                  </div>
                </div>

                {!g.result && phase !== "confirmed" ? (
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    {g.canConfirm ? (
                      <button
                        type="button"
                        disabled={busyId === g.matchId}
                        onClick={() => void confirm(g.matchId)}
                        className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Confirm time
                      </button>
                    ) : null}
                    {g.canPropose ? (
                      <>
                        {/* When a time is already proposed and we're not editing, show a compact Edit button */}
                        {phase === "pending" && editingScheduleId !== g.matchId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingScheduleId(g.matchId);
                              // Pre-fill the input with the currently proposed time
                              if (g.scheduledAt) {
                                const local = new Date(
                                  new Date(g.scheduledAt).getTime() -
                                    new Date(g.scheduledAt).getTimezoneOffset() * 60000,
                                )
                                  .toISOString()
                                  .slice(0, 16);
                                setProposeAt((prev) => ({ ...prev, [g.matchId]: local }));
                              }
                            }}
                            className="cursor-pointer rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-300 hover:border-cyan-400/60 hover:bg-cyan-500/20"
                          >
                            Edit time
                          </button>
                        ) : null}

                        {/* Show propose form for unset phase, or when editing a pending time */}
                        {(phase !== "pending" || editingScheduleId === g.matchId) ? (
                          <>
                            <div>
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
                                {phase === "pending" ? "Propose new time" : "Set kickoff"}
                              </p>
                              <input
                                type="datetime-local"
                                className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs text-white"
                                value={proposeAt[g.matchId] ?? ""}
                                min={new Date(
                                  new Date().getTime() -
                                    new Date().getTimezoneOffset() * 60000,
                                )
                                  .toISOString()
                                  .slice(0, 16)}
                                max={
                                  g.stageFinishesAt
                                    ? new Date(
                                        new Date(g.stageFinishesAt).getTime() -
                                          new Date(
                                            g.stageFinishesAt,
                                          ).getTimezoneOffset() * 60000,
                                      )
                                        .toISOString()
                                        .slice(0, 16)
                                    : undefined
                                }
                                onChange={(e) =>
                                  setProposeAt((prev) => ({
                                    ...prev,
                                    [g.matchId]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <button
                              type="button"
                              disabled={busyId === g.matchId}
                              onClick={() => void propose(g.matchId)}
                              className="cursor-pointer rounded-lg bg-cyan-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Save
                            </button>
                            {/* Cancel only shown when editing an existing proposed time */}
                            {editingScheduleId === g.matchId ? (
                              <button
                                type="button"
                                onClick={() => setEditingScheduleId(null)}
                                className="cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/50 hover:border-white/25 hover:text-white/70"
                              >
                                Cancel
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}

                {!g.result && phase === "confirmed" && !g.canSubmitResult ? (
                  <p className="mt-4 text-xs text-white/40">
                    Match is locked in. Result upload opens around kickoff (before the
                    deadline above).
                  </p>
                ) : null}

                {showResultForm ? (() => {
                  if (roundsMode) {
                    const myIsA = g.mySlot === 0;
                    const aReady =
                      form.winnerSlot !== null &&
                      form.scoreA !== "" &&
                      form.scoreB !== "" &&
                      Boolean(form.screenshotUrl);
                    return (
                      <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                            Submit round scores
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/45">
                            Pick the winner and enter round scores (e.g. 13–7) used for
                            standings RD / RW. Upload one screenshot.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              patchForm(g.matchId, form, {
                                winnerSlot: g.mySlot as 0 | 1,
                              })
                            }
                            className={`cursor-pointer rounded-md border px-2.5 py-1.5 text-xs ${
                              form.winnerSlot === g.mySlot
                                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                                : "border-white/10 text-white/55"
                            }`}
                          >
                            {g.myTeamName} wins
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              patchForm(g.matchId, form, {
                                winnerSlot: (g.mySlot === 0 ? 1 : 0) as 0 | 1,
                              })
                            }
                            className={`cursor-pointer rounded-md border px-2.5 py-1.5 text-xs ${
                              form.winnerSlot !== null &&
                              form.winnerSlot !== g.mySlot
                                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                                : "border-white/10 text-white/55"
                            }`}
                          >
                            {g.opponentTeamName} wins
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <label className="text-white/50">
                            {myIsA ? "Your rounds" : "Opp rounds"}
                            <input
                              type="number"
                              min={0}
                              className="ml-1 w-14 rounded bg-black/40 px-1.5 py-1 text-white ring-1 ring-white/10"
                              value={myIsA ? form.scoreA : form.scoreB}
                              onChange={(e) =>
                                patchForm(
                                  g.matchId,
                                  form,
                                  myIsA
                                    ? { scoreA: e.target.value }
                                    : { scoreB: e.target.value },
                                )
                              }
                            />
                          </label>
                          <span className="text-white/30">–</span>
                          <label className="text-white/50">
                            {myIsA ? "Opp rounds" : "Your rounds"}
                            <input
                              type="number"
                              min={0}
                              className="ml-1 w-14 rounded bg-black/40 px-1.5 py-1 text-white ring-1 ring-white/10"
                              value={myIsA ? form.scoreB : form.scoreA}
                              onChange={(e) =>
                                patchForm(
                                  g.matchId,
                                  form,
                                  myIsA
                                    ? { scoreB: e.target.value }
                                    : { scoreA: e.target.value },
                                )
                              }
                            />
                          </label>
                          <label className="cursor-pointer rounded border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                            {uploadingShot === g.matchId
                              ? "Uploading…"
                              : form.screenshotUrl
                                ? "Replace shot"
                                : "Upload shot"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingShot === g.matchId}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void uploadMatchScreenshot(g.matchId, f, form);
                              }}
                            />
                          </label>
                        </div>
                        {form.screenshotUrl ? (
                          <a
                            href={form.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block overflow-hidden rounded border border-white/10"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={form.screenshotUrl}
                              alt="Screenshot preview"
                              className="max-h-24 object-contain"
                            />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          disabled={busyId === g.matchId || !aReady}
                          onClick={() => void submitResult(g.matchId, form)}
                          className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Submit
                        </button>
                      </div>
                    );
                  }

                  const need = winsNeeded(g.matchFormat);
                  const max = maxGames(g.matchFormat);
                  const { a, b } = tally(form.games);
                  const myWins = g.mySlot === 0 ? a : b;
                  const oppWins = g.mySlot === 0 ? b : a;
                  const complete = seriesComplete(g.matchFormat, form.games);
                  const canAdd = !complete && form.games.length < max;

                  function setGameWinner(index: number, winnerSlot: 0 | 1) {
                    const next = [...form.games];
                    const prev = next[index];
                    next[index] = {
                      ...prev,
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
                    patchForm(g.matchId, form, { games: next.slice(0, cut) });
                  }

                  function addGame(winnerSlot: 0 | 1) {
                    if (!canAdd) return;
                    const next = [...form.games, { winnerSlot, screenshotUrl: null }];
                    patchForm(g.matchId, form, { games: next });
                  }

                  const proofsReady = allGamesHaveScreenshots(form.games);

                  return (
                  <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                          Submit series result
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/45">
                          {g.formatLabel ?? g.matchFormat} — pick each game winner
                          and upload that game&apos;s screenshot until someone
                          reaches {need}. Series score:{" "}
                          <span className="font-semibold text-white/80">
                            {myWins}–{oppWins}
                          </span>
                        </p>
                      </div>
                      {g.resultDeadlineAt ? (
                        <p
                          className={`text-[11px] ${
                            g.resultOverdue ? "text-rose-300" : "text-white/45"
                          }`}
                        >
                          Due {formatWhen(g.resultDeadlineAt)}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      {form.games.map((game, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center gap-2 rounded-lg bg-black/25 px-3 py-2"
                        >
                          <span className="w-14 text-[10px] font-bold uppercase tracking-wider text-white/40">
                            Game {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setGameWinner(i, g.mySlot as 0 | 1)}
                            className={`cursor-pointer rounded-md border px-2.5 py-1.5 text-xs truncate max-w-[140px] sm:max-w-[180px] ${
                              game.winnerSlot === g.mySlot
                                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 font-bold"
                                : "border-white/10 text-white/55 hover:text-white/80"
                            }`}
                          >
                            {g.myTeamName}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setGameWinner(i, (g.mySlot === 0 ? 1 : 0) as 0 | 1)
                            }
                            className={`cursor-pointer rounded-md border px-2.5 py-1.5 text-xs truncate max-w-[140px] sm:max-w-[180px] ${
                              game.winnerSlot !== g.mySlot
                                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 font-bold"
                                : "border-white/10 text-white/55 hover:text-white/80"
                            }`}
                          >
                            {g.opponentTeamName}
                          </button>

                          <div className="flex items-end gap-1.5 ml-2 mr-2">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[9px] font-semibold text-white/40 max-w-[120px] truncate">{g.myTeamName}</span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                className="w-12 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-center text-xs text-white"
                                value={g.mySlot === 0 ? (game.scoreA ?? "") : (game.scoreB ?? "")}
                                onChange={(e) => {
                                  const next = [...form.games];
                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                  if (g.mySlot === 0) next[i] = { ...next[i]!, scoreA: val };
                                  else next[i] = { ...next[i]!, scoreB: val };
                                  patchForm(g.matchId, form, { games: next });
                                }}
                              />
                            </div>
                            <span className="text-white/20 text-[10px] font-bold mb-2">–</span>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[9px] font-semibold text-white/40 max-w-[120px] truncate">{g.opponentTeamName}</span>
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                className="w-12 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-center text-xs text-white"
                                value={g.mySlot === 0 ? (game.scoreB ?? "") : (game.scoreA ?? "")}
                                onChange={(e) => {
                                  const next = [...form.games];
                                  const val = e.target.value === "" ? null : Number(e.target.value);
                                  if (g.mySlot === 0) next[i] = { ...next[i]!, scoreB: val };
                                  else next[i] = { ...next[i]!, scoreA: val };
                                  patchForm(g.matchId, form, { games: next });
                                }}
                              />
                            </div>
                          </div>
                          <label className="cursor-pointer rounded-md border border-white/15 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:border-white/30">
                            {game.screenshotUrl ? "Replace screenshot" : "Upload screenshot"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f)
                                  void uploadGameScreenshot(
                                    g.matchId,
                                    i,
                                    f,
                                    form,
                                  ).catch((err) =>
                                    setError(
                                      err instanceof Error
                                        ? err.message
                                        : "Upload failed",
                                    ),
                                  );
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
                            <span className="text-[10px] text-rose-300/70">Required</span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              patchForm(g.matchId, form, {
                                games: form.games.filter((_, j) => j !== i),
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
                      <div className="rounded-lg border border-dashed border-white/15 px-3 py-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                          Add game {form.games.length + 1} winner
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => addGame(g.mySlot as 0 | 1)}
                            className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:border-cyan-500/40 hover:text-cyan-100"
                          >
                            {g.myTeamName} won
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              addGame((g.mySlot === 0 ? 1 : 0) as 0 | 1)
                            }
                            className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:border-cyan-500/40 hover:text-cyan-100"
                          >
                            {g.opponentTeamName} won
                          </button>
                        </div>
                      </div>
                    ) : complete ? (
                      <p className="text-xs text-emerald-200/80">
                        Series decided {myWins}–{oppWins}.
                        {proofsReady
                          ? " All game screenshots ready — submit."
                          : " Upload a screenshot for each game, then submit."}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      disabled={
                        busyId === g.matchId || !complete || !proofsReady
                      }
                      onClick={() => void submitResult(g.matchId, form)}
                      className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Submit
                    </button>
                  </div>
                  );
                })() : null}
              </li>

            );
          })}
        </ul>
      )}
    </div>
  );
}
