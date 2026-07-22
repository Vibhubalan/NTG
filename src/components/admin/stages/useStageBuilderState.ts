"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StageType } from "@prisma/client";
import { requireApiJson } from "@/lib/parse-api-json";
import type { AdminStageGraph } from "@tournaments-leagues/index";
import { buildDrafts } from "./build-drafts";
import {
  graphFromPayload,
  localId,
  normalizeTopBottomSelector,
} from "./graph-normalize";
import type { Graph, StageNode } from "./types";

type TeamOpt = { id: string; name: string };

/** Light graph responses omit matches — keep any already-loaded match rows. */
function applyGraphPayload(
  prev: Graph | null,
  data: AdminStageGraph,
): Graph {
  const next = graphFromPayload(data);
  if (!prev) return next;
  return {
    ...next,
    stages: next.stages.map((s) => {
      const prior = prev.stages.find((p) => p.id === s.id);
      if (
        prior &&
        (s.matches?.length ?? 0) === 0 &&
        (prior.matches?.length ?? 0) > 0
      ) {
        return {
          ...s,
          matches: prior.matches,
          matchCount: Math.max(s.matchCount, prior.matchCount),
        };
      }
      return s;
    }),
  };
}

export function useStageBuilderState(
  slug: string,
  teams: TeamOpt[],
  initialGraph: AdminStageGraph | null = null,
) {
  const [graph, setGraph] = useState<Graph | null>(() =>
    initialGraph ? graphFromPayload(initialGraph) : null,
  );
  const [loading, setLoading] = useState(!initialGraph);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesLoadProgress, setMatchesLoadProgress] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [generateProgress, setGenerateProgress] = useState<string | null>(null);
  const [pendingGenerate, setPendingGenerate] = useState<{
    stageId: string;
    cursor: number;
    total: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialGraph?.stages[0]?.id ?? null,
  );
  const [savingMatchIds, setSavingMatchIds] = useState<Set<string>>(new Set());
  const [dragTeamId, setDragTeamId] = useState<string | null>(null);
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const scheduleSaveGen = useRef(new Map<string, number>());
  const scheduleAbort = useRef(new Map<string, AbortController>());
  const matchesLoadedRef = useRef(new Set<string>());

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        // Light graph only — matches load on demand for the Matches tab.
        const res = await fetch(`/api/admin/tournaments/${slug}/stages`);
        const data = (await requireApiJson(res)) as unknown as AdminStageGraph;
        setGraph((prev) => applyGraphPayload(prev, data));
        setDirty(false);
        setSelectedId((prev) => prev ?? data.stages[0]?.id ?? null);
        matchesLoadedRef.current.clear();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load stages");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [slug],
  );

  const loadMatchesForStage = useCallback(
    async (stageId: string, opts?: { force?: boolean }) => {
      if (!opts?.force && matchesLoadedRef.current.has(stageId)) {
        const existing = graphRef.current?.stages.find((s) => s.id === stageId);
        if ((existing?.matches?.length ?? 0) > 0 || existing?.matchCount === 0) {
          return;
        }
      }
      setMatchesLoading(true);
      setMatchesLoadProgress(null);
      setError(null);
      try {
        const batchLimit = 30;
        let offset = 0;
        let matchCount = 0;
        let allMatches: NonNullable<StageNode["matches"]> = [];

        for (;;) {
          setMatchesLoadProgress(
            matchCount > 0
              ? `Loading matches… ${Math.min(offset, matchCount)}/${matchCount}`
              : "Loading matches…",
          );
          const res = await fetch(
            `/api/admin/tournaments/${slug}/stages/${stageId}/matches?offset=${offset}&limit=${batchLimit}`,
          );
          const data = await requireApiJson(res);
          const batch = (data.matches ?? []) as NonNullable<
            StageNode["matches"]
          >;
          matchCount =
            typeof data.matchCount === "number" ? data.matchCount : batch.length;
          allMatches = [...allMatches, ...batch];
          offset += batch.length;

          setGraph((g) => {
            if (!g) return g;
            return {
              ...g,
              stages: g.stages.map((s) =>
                s.id === stageId
                  ? { ...s, matches: allMatches, matchCount }
                  : s,
              ),
            };
          });

          if (!data.hasMore || batch.length === 0) break;
          await new Promise((r) => setTimeout(r, 150));
        }

        matchesLoadedRef.current.add(stageId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load matches");
      } finally {
        setMatchesLoading(false);
        setMatchesLoadProgress(null);
      }
    },
    [slug],
  );

  useEffect(() => {
    // SSR already provided a light graph — don't re-fetch and risk timeout.
    if (initialGraph) return;
    void load();
  }, [load, initialGraph]);

  const selected = graph?.stages.find((s) => s.id === selectedId) ?? null;

  function patchSelected(mutator: (stage: StageNode) => StageNode) {
    if (!selectedId) return;
    setDirty(true);
    setGraph((g) => {
      if (!g) return g;
      return {
        ...g,
        stages: g.stages.map((s) => (s.id === selectedId ? mutator(s) : s)),
      };
    });
  }

  function patchStageById(
    stageId: string,
    mutator: (stage: StageNode) => StageNode,
  ) {
    setDirty(true);
    setGraph((g) => {
      if (!g) return g;
      return {
        ...g,
        stages: g.stages.map((s) => (s.id === stageId ? mutator(s) : s)),
      };
    });
  }

  async function addStage(opts?: {
    name?: string;
    stageType?: StageType;
  }): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${slug}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: opts?.name ?? `Stage ${(graph?.stages.length ?? 0) + 1}`,
          stageType: opts?.stageType ?? "ROUND_ROBIN",
        }),
      });
      const data = await requireApiJson(res);
      setGraph((prev) =>
        applyGraphPayload(prev, data as unknown as AdminStageGraph),
      );
      setDirty(false);
      const stages = data.stages as { id: string }[] | undefined;
      const last = stages?.[stages.length - 1];
      if (last) setSelectedId(last.id);
      return last?.id ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add stage");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function removeStage(stageId: string) {
    if (!confirm("Delete this stage?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/stages/${stageId}`,
        { method: "DELETE" },
      );
      const data = await requireApiJson(res);
      setGraph((prev) =>
        applyGraphPayload(prev, data as unknown as AdminStageGraph),
      );
      setDirty(false);
      const stages = data.stages as { id?: string }[] | undefined;
      setSelectedId(stages?.[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  function setGroupCount(stage: StageNode, groupCount: number) {
    const current =
      graphRef.current?.stages.find((s) => s.id === stage.id) ?? stage;
    const assigned = current.groups.flatMap((g) =>
      g.slots
        .filter((s) => s.teamId)
        .map((s) => ({
          teamId: s.teamId!,
          teamName: s.teamName,
        })),
    );
    const buckets: { teamId: string; teamName: string | null }[][] = Array.from(
      { length: groupCount },
      () => [],
    );
    assigned.forEach((t, i) => {
      buckets[i % groupCount]!.push(t);
    });

    const oldOrderById = new Map(current.groups.map((g) => [g.id, g.order]));
    const groups = Array.from({ length: groupCount }, (_, i) => {
      const existing = current.groups[i];
      const bucket = buckets[i] ?? [];
      const size = Math.max(bucket.length, 2);
      return {
        id: existing?.id ?? localId("g"),
        name: existing?.name ?? `Pool ${String.fromCharCode(65 + i)}`,
        order: i + 1,
        targetSize: size,
        slots: Array.from({ length: size }, (_, si) => ({
          id: localId("slot"),
          slotIndex: si,
          teamId: bucket[si]?.teamId ?? null,
          teamName: bucket[si]?.teamName ?? null,
          sourceStageId: null,
          sourceGroupId: null,
          sourcePosition: null,
        })),
      };
    });

    const orderToNewId = new Map(groups.map((g) => [g.order, g.id]));
    const rules = current.rules.map((r) => {
      if (!r.groupId) return r;
      const order = oldOrderById.get(r.groupId);
      return {
        ...r,
        groupId: order != null ? (orderToNewId.get(order) ?? null) : null,
      };
    });

    patchStageById(current.id, (s) => ({ ...s, groups, rules }));
  }

  function defaultDestination(
    fromStage: StageNode,
  ): StageNode["rules"][number]["destination"] {
    const next = (graph?.stages ?? [])
      .filter((s) => s.order === fromStage.order + 1)
      .sort((a, b) => a.order - b.order)[0];
    if (next) return { kind: "STAGE", stageId: next.id };
    return { kind: "CHAMPION" };
  }

  function addRule(stage: StageNode) {
    const current =
      graphRef.current?.stages.find((s) => s.id === stage.id) ?? stage;
    patchStageById(current.id, (s) => ({
      ...s,
      rules: [
        ...s.rules,
        {
          id: localId("rule"),
          groupId: current.groups[0]?.id ?? null,
          priority: s.rules.length,
          selector: { kind: "TOP_N", n: 2 },
          destination: defaultDestination(current),
        },
      ],
    }));
  }

  function updateRule(
    stageId: string,
    ri: number,
    next: StageNode["rules"][number],
  ) {
    patchStageById(stageId, (s) => {
      const rules = [...s.rules];
      rules[ri] = next;
      return { ...s, rules };
    });
  }

  function removeRule(stageId: string, ri: number) {
    patchStageById(stageId, (s) => ({
      ...s,
      rules: s.rules.filter((_, i) => i !== ri),
    }));
  }

  async function saveSettings(stageId: string) {
    const stage = graphRef.current?.stages.find((s) => s.id === stageId);
    if (!stage) return;
    const previous =
      graphRef.current?.stages.find((s) => s.order === stage.order - 1) ?? null;
    const feederStageIds =
      stage.seedSource === "PREVIOUS_STAGE"
        ? stage.feederStageIds.length > 0
          ? stage.feederStageIds
          : previous
            ? [previous.id]
            : []
        : [];
    setBusy(true);
    setError(null);
    setSyncNote(null);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/stages/${stageId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: stage.name,
            stageType: stage.stageType,
            matchFormat: stage.matchFormat,
            seedingMethod: stage.seedingMethod,
            seedSource: stage.seedSource,
            feederStageIds,
            finalsMatchFormat: stage.finalsMatchFormat,
            finishesAt: stage.finishesAt,
            resultWindowHours: stage.resultWindowHours,
          }),
        },
      );
      const data = await requireApiJson(res);
      setGraph((prev) =>
        applyGraphPayload(prev, data as unknown as AdminStageGraph),
      );
      setDirty(false);
      setSyncNote("Stage settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setBusy(false);
    }
  }

  async function savePools(stageId: string) {
    const stage = graphRef.current?.stages.find((s) => s.id === stageId);
    if (!stage) return;
    setBusy(true);
    setError(null);
    setSyncNote(null);
    try {
      const groups = stage.groups.map((g) => ({
        id: g.id,
        name: g.name,
        order: g.order,
        targetSize: g.targetSize,
        slots: g.slots.map((slot) => ({
          slotIndex: slot.slotIndex,
          teamId: slot.teamId,
          sourceStageId: slot.sourceStageId,
          sourceGroupId: slot.sourceGroupId,
          sourcePosition: slot.sourcePosition,
        })),
      }));
      const res = await fetch(
        `/api/admin/tournaments/${slug}/stages/${stageId}/groups`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groups }),
        },
      );
      const data = await requireApiJson(res);
      setGraph((prev) =>
        applyGraphPayload(prev, data as unknown as AdminStageGraph),
      );
      setDirty(false);
      setSyncNote("Teams & pools saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save pools");
    } finally {
      setBusy(false);
    }
  }

  async function saveRules(stageId: string) {
    const stage = graphRef.current?.stages.find((s) => s.id === stageId);
    if (!stage) return;
    setBusy(true);
    setError(null);
    setSyncNote(null);
    try {
      const rules = stage.rules.map((r) => ({
        groupId: r.groupId,
        priority: r.priority,
        selector:
          r.selector.kind === "TOP_N" || r.selector.kind === "BOTTOM_N"
            ? normalizeTopBottomSelector(r.selector.kind, r.selector.n)
            : r.selector,
        destination: r.destination,
      }));
      const res = await fetch(
        `/api/admin/tournaments/${slug}/stages/${stageId}/rules`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules }),
        },
      );
      const data = await requireApiJson(res);
      setGraph((prev) =>
        applyGraphPayload(prev, data as unknown as AdminStageGraph),
      );
      setDirty(false);
      setSyncNote("Qualification rules saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rules");
    } finally {
      setBusy(false);
    }
  }

  const teamNameById = useMemo(() => {
    const m = new Map(teams.map((t) => [t.id, t.name]));
    for (const s of graph?.stages ?? []) {
      for (const g of s.groups) {
        for (const slot of g.slots) {
          if (slot.teamId && slot.teamName) m.set(slot.teamId, slot.teamName);
        }
      }
      for (const e of s.seeding) m.set(e.teamId, e.teamName);
    }
    return m;
  }, [teams, graph]);

  function reshufflePools(stage: StageNode) {
    const current =
      graphRef.current?.stages.find((s) => s.id === stage.id) ?? stage;
    const fromSlots = current.groups.flatMap((g) =>
      g.slots
        .filter((s) => s.teamId)
        .map((s) => ({
          teamId: s.teamId!,
          teamName: s.teamName ?? teamNameById.get(s.teamId!) ?? "Team",
        })),
    );
    const fromSeeds = current.seeding.map((e) => ({
      teamId: e.teamId,
      teamName: e.teamName,
    }));
    const fromCup =
      current.seedSource === "TEAMS"
        ? teams.map((t) => ({ teamId: t.id, teamName: t.name }))
        : [];

    const byId = new Map<string, string>();
    for (const t of [...fromCup, ...fromSeeds, ...fromSlots]) {
      byId.set(t.teamId, t.teamName);
    }
    const roster = [...byId.entries()].map(([teamId, teamName]) => ({
      teamId,
      teamName,
    }));
    if (roster.length === 0 || current.groups.length === 0) return;

    for (let i = roster.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roster[i], roster[j]] = [roster[j]!, roster[i]!];
    }

    const groupCount = current.groups.length;
    const buckets: { teamId: string; teamName: string }[][] = Array.from(
      { length: groupCount },
      () => [],
    );
    roster.forEach((t, i) => {
      buckets[i % groupCount]!.push(t);
    });

    patchStageById(current.id, (s) => ({
      ...s,
      seedingMethod: "RANDOM",
      groups: s.groups.map((g, gi) => {
        const bucket = buckets[gi] ?? [];
        const size = Math.max(bucket.length, 2);
        return {
          ...g,
          targetSize: size,
          slots: Array.from({ length: size }, (_, si) => ({
            id: localId("slot"),
            slotIndex: si,
            teamId: bucket[si]?.teamId ?? null,
            teamName: bucket[si]?.teamName ?? null,
            sourceStageId: null,
            sourceGroupId: null,
            sourcePosition: null,
          })),
        };
      }),
    }));
  }

  const rosterForSelected = useMemo(() => {
    if (!selected) return [] as { id: string; name: string }[];
    if (selected.seedSource === "TEAMS") {
      return teams.map((t) => ({ id: t.id, name: t.name }));
    }
    const fromSlots = selected.groups.flatMap((g) =>
      g.slots
        .filter((s) => s.teamId)
        .map((s) => ({
          id: s.teamId!,
          name: s.teamName ?? teamNameById.get(s.teamId!) ?? "Team",
        })),
    );
    const fromSeeds = selected.seeding.map((e) => ({
      id: e.teamId,
      name: e.teamName,
    }));
    const merged = new Map<string, string>();
    for (const t of [...fromSeeds, ...fromSlots]) merged.set(t.id, t.name);
    return [...merged.entries()].map(([id, name]) => ({ id, name }));
  }, [selected, teams, teamNameById]);

  const assignedIds = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(
      selected.groups.flatMap((g) =>
        g.slots.map((s) => s.teamId).filter((id): id is string => Boolean(id)),
      ),
    );
  }, [selected]);

  const unassigned = useMemo(
    () => rosterForSelected.filter((t) => !assignedIds.has(t.id)),
    [rosterForSelected, assignedIds],
  );

  function moveTeamToPool(
    stageId: string,
    teamId: string,
    targetGroupId: string | "UNASSIGNED",
  ) {
    patchStageById(stageId, (stage) => {
      const name = teamNameById.get(teamId) ?? "Team";
      const groups = stage.groups.map((g) => ({
        ...g,
        slots: g.slots
          .filter((s) => s.teamId !== teamId)
          .map((s, i) => ({ ...s, slotIndex: i })),
      }));

      if (targetGroupId === "UNASSIGNED") {
        return { ...stage, groups };
      }

      return {
        ...stage,
        groups: groups.map((g) => {
          if (g.id !== targetGroupId) return g;
          const slots = [
            ...g.slots,
            {
              id: localId("slot"),
              slotIndex: g.slots.length,
              teamId,
              teamName: name,
              sourceStageId: null,
              sourceGroupId: null,
              sourcePosition: null,
            },
          ];
          return {
            ...g,
            targetSize: Math.max(g.targetSize ?? 0, slots.length, 2),
            slots,
          };
        }),
      };
    });
  }

  async function continueGenerateInsert(
    stageId: string,
    startCursor: number,
    startTotal: number,
  ) {
    let cursor = startCursor;
    let total = startTotal;
    setPendingGenerate({ stageId, cursor, total });

    while (true) {
      setGenerateProgress(
        total > 0
          ? `Creating match ${Math.min(cursor + 1, total)}/${total}…`
          : "Creating matches…",
      );
      const insertRes = await fetch(
        `/api/admin/tournaments/${slug}/stages/${stageId}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "insert", cursor }),
        },
      );
      const insertData = (await requireApiJson(insertRes)) as {
        cursor: number;
        total: number;
        complete: boolean;
      };
      cursor = insertData.cursor;
      total = insertData.total;
      setPendingGenerate({ stageId, cursor, total });
      setGenerateProgress(
        `Creating match ${Math.min(cursor, total)}/${total}…`,
      );
      if (insertData.complete || cursor >= total) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    setGenerateProgress("Finalizing…");
    setPendingGenerate({ stageId, cursor, total });
    const finalizeRes = await fetch(
      `/api/admin/tournaments/${slug}/stages/${stageId}/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "finalize" }),
      },
    );
    await requireApiJson(finalizeRes);
    setPendingGenerate(null);
    setGenerateProgress(null);
  }

  async function generate(stageId: string) {
    setBusy(true);
    setError(null);
    setGenerateProgress("Saving drafts…");
    setPendingGenerate(null);
    try {
      const drafts = buildDrafts(graphRef.current);
      await requireApiJson(
        await fetch(
          `/api/admin/tournaments/${slug}/stages/${stageId}/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phase: "commit", drafts }),
          },
        ),
      );

      // Seed from cup teams OR earlier-stage qualifiers (own request — Stage 2+).
      const targetDraft = drafts.find((d) => d.id === stageId);
      setGenerateProgress(
        targetDraft?.seedSource === "PREVIOUS_STAGE"
          ? "Seeding from earlier stages…"
          : "Seeding teams…",
      );
      await requireApiJson(
        await fetch(
          `/api/admin/tournaments/${slug}/stages/${stageId}/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phase: "seed",
              drafts: drafts.filter((d) => d.id === stageId),
            }),
          },
        ),
      );

      setGenerateProgress("Preparing…");
      const prepareRes = await fetch(
        `/api/admin/tournaments/${slug}/stages/${stageId}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "prepare" }),
        },
      );
      const prepared = (await requireApiJson(prepareRes)) as {
        cursor: number;
        total: number;
      };
      await continueGenerateInsert(
        stageId,
        prepared.cursor ?? 0,
        prepared.total ?? 0,
      );
      matchesLoadedRef.current.delete(stageId);
      await load({ silent: true });
      await loadMatchesForStage(stageId, { force: true });
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
      setGenerateProgress(null);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function resumeGenerate() {
    if (!pendingGenerate) return;
    const { stageId, cursor, total } = pendingGenerate;
    setBusy(true);
    setError(null);
    try {
      await continueGenerateInsert(stageId, cursor, total);
      matchesLoadedRef.current.delete(stageId);
      await load({ silent: true });
      await loadMatchesForStage(stageId, { force: true });
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
      setGenerateProgress(null);
    } finally {
      setBusy(false);
    }
  }

  async function syncPipeline() {
    if (
      !confirm(
        "Sync all stages?\n\nSaves your rules, re-pulls qualifiers Stage 1 → 2 → 3…, and rebuilds brackets that don’t have results yet.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setSyncNote(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${slug}/stages/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drafts: buildDrafts(graphRef.current) }),
      });
      const data = await requireApiJson(res);
      setGraph((prev) =>
        applyGraphPayload(prev, data.graph as unknown as AdminStageGraph),
      );
      matchesLoadedRef.current.clear();
      setDirty(false);
      const lines = (
        data.synced as Array<{
          name: string;
          teamCount: number;
          regenerated: boolean;
          skippedResults: boolean;
          byFeeder: { stageName: string; count: number }[];
        }>
      ).map((s) => {
        const feed =
          s.byFeeder.length > 0
            ? s.byFeeder.map((f) => `${f.stageName}: ${f.count}`).join(", ")
            : "no feeders";
        const note = s.skippedResults
          ? "roster updated (kept existing results)"
          : s.regenerated
            ? "bracket regenerated"
            : "roster only";
        return `${s.name}: ${s.teamCount} teams (${feed}) — ${note}`;
      });
      setSyncNote(
        lines.length > 0
          ? lines.join("\n")
          : "No later stages to sync (add Stage 2+ with Previous stage).",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function setMatchWinner(matchId: string, winnerSlot: number) {
    if (!selectedId) return;
    setError(null);
    const stage = graph?.stages.find((s) => s.id === selectedId);
    const existing = stage?.matches?.find((m) => m.id === matchId);
    const clearing = existing?.result?.winnerSlot === winnerSlot;

    setSavingMatchIds((prev) => new Set(prev).add(matchId));
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/matches/${matchId}/result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clearing ? { clear: true } : { winnerSlot }),
        },
      );
      await requireApiJson(res);
      await loadMatchesForStage(selectedId, { force: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save result");
      void loadMatchesForStage(selectedId, { force: true });
    } finally {
      setSavingMatchIds((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    }
  }

  async function assignBracketTeam(
    matchId: string,
    slot: number,
    team: { id: string; name: string } | null,
  ) {
    setError(null);
    setSavingMatchIds((prev) => new Set(prev).add(matchId));
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/matches/${matchId}/participant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            team
              ? { slot, teamId: team.id, teamLabel: team.name }
              : { slot, teamId: null },
          ),
        },
      );
      await requireApiJson(res);
      if (selectedId) await loadMatchesForStage(selectedId, { force: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign team");
    } finally {
      setSavingMatchIds((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    }
  }

  async function reshuffleBracket(stageId: string) {
    setBusy(true);
    setError(null);
    setGenerateProgress("Reshuffling…");
    setPendingGenerate(null);
    try {
      const res = await fetch(
        `/api/admin/tournaments/${slug}/stages/${stageId}/reshuffle`,
        { method: "POST" },
      );
      const prepared = (await requireApiJson(res)) as {
        cursor: number;
        total: number;
      };
      await continueGenerateInsert(
        stageId,
        prepared.cursor ?? 0,
        prepared.total ?? 0,
      );
      matchesLoadedRef.current.delete(stageId);
      await load({ silent: true });
      await loadMatchesForStage(stageId, { force: true });
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reshuffle failed");
      setGenerateProgress(null);
    } finally {
      setBusy(false);
    }
  }

  async function setMatchSchedule(
    matchId: string,
    scheduledAtLocal: string,
    forceConfirm = false,
  ) {
    setError(null);
    scheduleAbort.current.get(matchId)?.abort();
    const ac = new AbortController();
    scheduleAbort.current.set(matchId, ac);
    const gen = (scheduleSaveGen.current.get(matchId) ?? 0) + 1;
    scheduleSaveGen.current.set(matchId, gen);
    setSavingMatchIds((prev) => new Set(prev).add(matchId));
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/schedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: ac.signal,
        body: JSON.stringify({
          scheduledAt: new Date(scheduledAtLocal).toISOString(),
          forceConfirm,
        }),
      });
      await requireApiJson(res);
      // Ignore stale soft-saves that finished after a newer Force/save.
      if (scheduleSaveGen.current.get(matchId) !== gen) return;
      if (selectedId) await loadMatchesForStage(selectedId, { force: true });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (scheduleSaveGen.current.get(matchId) !== gen) return;
      setError(e instanceof Error ? e.message : "Failed to set schedule");
    } finally {
      if (scheduleSaveGen.current.get(matchId) === gen) {
        setSavingMatchIds((prev) => {
          const next = new Set(prev);
          next.delete(matchId);
          return next;
        });
      }
    }
  }

  const laterStagesForSelected =
    selected != null
      ? (graph?.stages ?? [])
          .filter((s) => s.order > selected.order)
          .sort((a, b) => a.order - b.order)
      : [];
  const earlierStagesForSelected =
    selected != null
      ? (graph?.stages ?? [])
          .filter((s) => s.order < selected.order)
          .sort((a, b) => a.order - b.order)
      : [];
  const previousStage =
    selected != null
      ? (graph?.stages ?? []).find((s) => s.order === selected.order - 1) ?? null
      : null;

  return {
    graph,
    setGraph,
    loading,
    busy,
    dirty,
    error,
    setError,
    syncNote,
    generateProgress,
    pendingGenerate,
    selectedId,
    setSelectedId,
    selected,
    savingMatchIds,
    dragTeamId,
    setDragTeamId,
    teamNameById,
    rosterForSelected,
    unassigned,
    laterStagesForSelected,
    earlierStagesForSelected,
    previousStage,
    teams,
    patchSelected,
    patchStageById,
    addStage,
    removeStage,
    setGroupCount,
    addRule,
    updateRule,
    removeRule,
    saveSettings,
    savePools,
    saveRules,
    reshufflePools,
    moveTeamToPool,
    generate,
    resumeGenerate,
    syncPipeline,
    setMatchWinner,
    assignBracketTeam,
    reshuffleBracket,
    setMatchSchedule,
    loadMatchesForStage,
    matchesLoading,
    matchesLoadProgress,
    reload: () =>
      selectedId
        ? loadMatchesForStage(selectedId, { force: true })
        : load({ silent: true }),
  };
}

export type StageBuilderState = ReturnType<typeof useStageBuilderState>;
