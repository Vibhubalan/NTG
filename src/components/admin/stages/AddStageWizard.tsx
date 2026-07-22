"use client";

import { useMemo, useState } from "react";
import type { StageType } from "@prisma/client";
import { isElimType, toLocalDatetimeValue } from "./graph-normalize";
import GenerateStageButton from "./GenerateStageButton";
import PoolBoard from "./PoolBoard";
import QualificationRuleRow from "./QualificationRuleRow";
import { STAGE_TYPES, type SeedSource, type StageNode } from "./types";
import type { StageBuilderState } from "./useStageBuilderState";

type Props = {
  state: StageBuilderState;
  onDone: (stageId: string) => void;
  onCancel: () => void;
};

const inputClass =
  "mt-1 w-full rounded-lg bg-black/30 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-cyan-500/40";

export default function AddStageWizard({ state, onDone, onCancel }: Props) {
  const [step, setStep] = useState(1);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [name, setName] = useState(
    `Stage ${(state.graph?.stages.length ?? 0) + 1}`,
  );
  const [stageType, setStageType] = useState<StageType>("ROUND_ROBIN");
  const [matchFormat, setMatchFormat] = useState<"BO1" | "BO3" | "BO5">("BO3");
  const [finalsMatchFormat, setFinalsMatchFormat] = useState<"BO1" | "BO3" | "BO5">(
    "BO5",
  );
  const [seedSource, setSeedSource] = useState<SeedSource>(
    (state.graph?.stages.length ?? 0) > 0 ? "PREVIOUS_STAGE" : "TEAMS",
  );
  const [finishesAt, setFinishesAt] = useState("");
  const [resultWindowHours, setResultWindowHours] = useState(3);

  const stage = useMemo(
    () =>
      createdId
        ? (state.graph?.stages.find((s) => s.id === createdId) ?? null)
        : null,
    [createdId, state.graph],
  );

  const laterStages = useMemo(() => {
    if (!stage) return [] as StageNode[];
    return (state.graph?.stages ?? [])
      .filter((s) => s.order > stage.order)
      .sort((a, b) => a.order - b.order);
  }, [stage, state.graph]);

  async function createAndContinue() {
    const id = await state.addStage({ name, stageType });
    if (!id) return;
    setCreatedId(id);
    // Apply step-1 fields onto the new stage
    state.patchStageById(id, (s) => {
      const prevId =
        state.graph?.stages.find((x) => x.order === s.order - 1)?.id ?? null;
      return {
        ...s,
        name,
        stageType,
        matchFormat: isElimType(stageType)
          ? matchFormat === "BO1"
            ? "BO3"
            : matchFormat
          : matchFormat,
        finalsMatchFormat: isElimType(stageType) ? finalsMatchFormat : null,
        seedSource: s.order > 1 ? seedSource : "TEAMS",
        feederStageIds:
          s.order > 1 && seedSource === "PREVIOUS_STAGE" && prevId
            ? s.feederStageIds.length > 0
              ? s.feederStageIds
              : [prevId]
            : [],
        finishesAt: finishesAt ? new Date(finishesAt).toISOString() : null,
        resultWindowHours,
      };
    });
    setStep(2);
  }

  function finishWizard() {
    if (!createdId) return;
    void state
      .generate(createdId)
      .then(() => onDone(createdId))
      .catch(() => {
        /* error already set on state */
      });
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/40">
            Add stage · Step {step} of 4
          </p>
          <p className="mt-0.5 text-sm text-white/60">
            {step === 1
              ? "Core settings"
              : step === 2
                ? "Pool assignment"
                : step === 3
                  ? "Qualification rules"
                  : "Summary & generate"}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70"
        >
          {createdId ? "Exit to editor" : "Cancel"}
        </button>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full ${
              n <= step ? "bg-cyan-500/70" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-white/50 sm:col-span-2">
            Name
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-xs text-white/50">
            Format
            <select
              className={inputClass}
              value={stageType}
              onChange={(e) => {
                const t = e.target.value as StageType;
                setStageType(t);
                if (isElimType(t) && matchFormat === "BO1") setMatchFormat("BO3");
              }}
            >
              {STAGE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-white/50">
            Match format
            <select
              className={inputClass}
              value={matchFormat}
              onChange={(e) =>
                setMatchFormat(e.target.value as "BO1" | "BO3" | "BO5")
              }
            >
              <option value="BO1">BO1</option>
              <option value="BO3">BO3</option>
              <option value="BO5">BO5</option>
            </select>
          </label>
          {isElimType(stageType) ? (
            <label className="block text-xs text-white/50">
              Finals format
              <select
                className={inputClass}
                value={finalsMatchFormat}
                onChange={(e) =>
                  setFinalsMatchFormat(e.target.value as "BO1" | "BO3" | "BO5")
                }
              >
                <option value="BO1">BO1</option>
                <option value="BO3">BO3</option>
                <option value="BO5">BO5</option>
              </select>
            </label>
          ) : null}
          <label className="block text-xs text-white/50">
            Seed source
            <select
              className={inputClass}
              value={seedSource}
              onChange={(e) => setSeedSource(e.target.value as SeedSource)}
              disabled={(state.graph?.stages.length ?? 0) === 0}
            >
              <option value="TEAMS">Cup teams</option>
              <option value="PREVIOUS_STAGE">Previous stage</option>
            </select>
          </label>
          <label className="block text-xs text-white/50">
            Finishes by
            <input
              type="datetime-local"
              className={inputClass}
              value={finishesAt}
              onChange={(e) => setFinishesAt(e.target.value)}
            />
          </label>
          <label className="block text-xs text-white/50">
            Result window (hours)
            <input
              type="number"
              min={1}
              className={inputClass}
              value={resultWindowHours ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setResultWindowHours(undefined as unknown as number);
                } else {
                  const parsed = parseInt(raw, 10);
                  if (!isNaN(parsed)) {
                    setResultWindowHours(Math.max(1, parsed));
                  }
                }
              }}
              onBlur={() => {
                if (
                  typeof resultWindowHours !== "number" ||
                  isNaN(resultWindowHours) ||
                  resultWindowHours < 1
                ) {
                  setResultWindowHours(3);
                }
              }}
            />
          </label>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={state.busy || !name.trim()}
              onClick={() => void createAndContinue()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 && stage ? (
        <div className="space-y-4">
          <PoolBoard
            selected={stage}
            unassigned={state.unassigned}
            dragTeamId={state.dragTeamId}
            setDragTeamId={state.setDragTeamId}
            busy={state.busy}
            onSetGroupCount={(n) => state.setGroupCount(stage, n)}
            onReshuffle={() => state.reshufflePools(stage)}
            onMoveTeam={(teamId, target) =>
              state.moveTeamToPool(stage.id, teamId, target)
            }
            onPatch={(mutator) => state.patchStageById(stage.id, mutator)}
          />
          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-[10px] font-bold uppercase tracking-wider text-white/40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 && stage ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => state.addRule(stage)}
              className="text-[10px] font-bold uppercase tracking-wider text-cyan-400"
            >
              + Add rule
            </button>
          </div>
          {stage.rules.length === 0 ? (
            <p className="text-sm text-white/35">
              Optional — you can add rules later in the Rules tab.
            </p>
          ) : (
            stage.rules.map((rule, ri) => (
              <QualificationRuleRow
                key={rule.id}
                rule={rule}
                groups={stage.groups}
                laterStages={laterStages}
                maxPos={Math.max(
                  8,
                  ...stage.groups.map((g) => g.slots.length || g.targetSize || 0),
                )}
                onChange={(next) => state.updateRule(stage.id, ri, next)}
                onRemove={() => state.removeRule(stage.id, ri)}
              />
            ))
          )}
          <div className="flex justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-[10px] font-bold uppercase tracking-wider text-white/40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 && stage ? (
        <div className="space-y-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wider text-white/35">
                Name
              </dt>
              <dd className="text-white/80">{stage.name}</dd>
            </div>
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wider text-white/35">
                Format
              </dt>
              <dd className="text-white/80">
                {stage.stageType.replaceAll("_", " ")} · {stage.matchFormat}
              </dd>
            </div>
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wider text-white/35">
                Pools
              </dt>
              <dd className="text-white/80">{stage.groups.length}</dd>
            </div>
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wider text-white/35">
                Rules
              </dt>
              <dd className="text-white/80">{stage.rules.length}</dd>
            </div>
            <div className="rounded-lg bg-black/25 px-3 py-2 sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-white/35">
                Deadlines
              </dt>
              <dd className="text-white/80">
                {stage.finishesAt
                  ? `Finish by ${toLocalDatetimeValue(stage.finishesAt).replace("T", " ")}`
                  : "No finish deadline"}{" "}
                · {stage.resultWindowHours}h result window
              </dd>
            </div>
          </dl>
          <GenerateStageButton
            busy={state.busy}
            runnable={stage.runnable}
            matchCount={stage.matchCount}
            onGenerate={finishWizard}
            progressLabel={state.generateProgress}
            canResume={
              Boolean(state.pendingGenerate) &&
              state.pendingGenerate?.stageId === createdId
            }
            onResume={() => {
              if (!createdId) return;
              void state
                .resumeGenerate()
                .then(() => onDone(createdId))
                .catch(() => {
                  /* error already set on state */
                });
            }}
          />
          {state.generateProgress ? (
            <p className="text-center text-xs text-emerald-200/80">
              {state.generateProgress}
            </p>
          ) : null}
          {state.error ? (
            <p className="text-center text-xs text-rose-200">{state.error}</p>
          ) : null}
          <button
            type="button"
            onClick={() => setStep(3)}
            className="text-[10px] font-bold uppercase tracking-wider text-white/40"
          >
            Back
          </button>
        </div>
      ) : null}
    </div>
  );
}
