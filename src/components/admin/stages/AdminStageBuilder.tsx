"use client";

import { useEffect, useState } from "react";
import AddStageWizard from "./AddStageWizard";
import StageDetailTabs from "./StageDetailTabs";
import StageList from "./StageList";
import StageMatchesTab from "./StageMatchesTab";
import StagePipelineBar from "./StagePipelineBar";
import StagePoolsTab from "./StagePoolsTab";
import StageRulesTab from "./StageRulesTab";
import StageSettingsTab from "./StageSettingsTab";
import type { AdminStageBuilderProps, StageDetailTabId } from "./types";
import { useStageBuilderState } from "./useStageBuilderState";

export default function AdminStageBuilder({
  slug,
  teams,
  initialGraph = null,
}: AdminStageBuilderProps) {
  const state = useStageBuilderState(slug, teams, initialGraph);
  const [activeTab, setActiveTab] = useState<StageDetailTabId>("settings");
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    setActiveTab("settings");
  }, [state.selectedId]);

  useEffect(() => {
    if (activeTab !== "matches" || !state.selectedId) return;
    void state.loadMatchesForStage(state.selectedId);
  }, [activeTab, state.selectedId, state.loadMatchesForStage]);

  if (state.loading && !state.graph) {
    return <p className="text-sm text-white/50">Loading stage builder…</p>;
  }

  const { selected } = state;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-white">
          Stage Builder
        </h3>
        <p className="mt-1 text-sm text-white/45">
          Edit Settings, Pools, or Rules, then{" "}
          <span className="text-white/70">Save</span> that section. Use{" "}
          <span className="text-white/70">Generate</span> on Matches to build
          fixtures.
        </p>
      </div>

      {state.error ? (
        <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {state.error}
        </div>
      ) : null}
      {state.syncNote ? (
        <div className="whitespace-pre-wrap rounded-xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100/90">
          {state.syncNote}
        </div>
      ) : null}
      {state.dirty ? (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
          Unsaved draft changes — Save the section you edited to apply.
        </div>
      ) : null}
      {(state.graph?.validation.length ?? 0) > 0 ? (
        <ul className="space-y-1 rounded-xl bg-amber-500/5 px-4 py-3 text-xs text-amber-100/80">
          {state.graph!.validation.map((v, i) => (
            <li key={`${v.path}-${i}`}>
              <span className="text-white/40">{v.path}</span> — {v.message}
            </li>
          ))}
        </ul>
      ) : null}

      <StagePipelineBar stages={state.graph?.stages ?? []} />

      <StageList
        stages={state.graph?.stages ?? []}
        selectedId={state.selectedId}
        onSelect={(id) => {
          setWizardOpen(false);
          state.setSelectedId(id);
        }}
      />

      {!wizardOpen ? (
        <button
          type="button"
          disabled={state.busy}
          onClick={() => setWizardOpen(true)}
          className="rounded-lg bg-cyan-600/90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 disabled:opacity-40"
        >
          + Add Stage
        </button>
      ) : (
        <AddStageWizard
          state={state}
          onCancel={() => setWizardOpen(false)}
          onDone={(stageId) => {
            setWizardOpen(false);
            state.setSelectedId(stageId);
            setActiveTab("matches");
          }}
        />
      )}

      {selected && !wizardOpen ? (
        <StageDetailTabs activeTab={activeTab} onChange={setActiveTab}>
          {activeTab === "settings" ? (
            <StageSettingsTab
              selected={selected}
              busy={state.busy}
              dirty={state.dirty}
              previousStage={state.previousStage}
              earlierStages={state.earlierStagesForSelected}
              onPatch={state.patchSelected}
              onDelete={() => void state.removeStage(selected.id)}
              onSave={() => void state.saveSettings(selected.id)}
            />
          ) : null}
          {activeTab === "pools" ? (
            <StagePoolsTab
              selected={selected}
              unassigned={state.unassigned}
              dragTeamId={state.dragTeamId}
              setDragTeamId={state.setDragTeamId}
              busy={state.busy}
              dirty={state.dirty}
              onSetGroupCount={state.setGroupCount}
              onReshuffle={state.reshufflePools}
              onMoveTeam={(teamId, target) =>
                state.moveTeamToPool(selected.id, teamId, target)
              }
              onPatch={state.patchSelected}
              onSave={() => void state.savePools(selected.id)}
            />
          ) : null}
          {activeTab === "rules" ? (
            <StageRulesTab
              selected={selected}
              laterStages={state.laterStagesForSelected}
              busy={state.busy}
              dirty={state.dirty}
              onAddRule={state.addRule}
              onUpdateRule={(ri, next) =>
                state.updateRule(selected.id, ri, next)
              }
              onRemoveRule={(ri) => state.removeRule(selected.id, ri)}
              onSave={() => void state.saveRules(selected.id)}
            />
          ) : null}
          {activeTab === "matches" ? (
            state.matchesLoading && !(selected.matches?.length) ? (
              <p className="px-1 py-8 text-sm text-white/45">
                {state.matchesLoadProgress ?? "Loading matches…"}
              </p>
            ) : (
            <StageMatchesTab
              slug={slug}
              selected={selected}
              teams={teams}
              busy={state.busy}
              savingMatchIds={state.savingMatchIds}
              generateProgress={state.generateProgress}
              canResumeGenerate={
                Boolean(state.pendingGenerate) &&
                state.pendingGenerate?.stageId === selected.id
              }
              onGenerate={() => void state.generate(selected.id)}
              onResumeGenerate={() => void state.resumeGenerate()}
              onSetSchedule={(id, local, force) =>
                void state.setMatchSchedule(id, local, force)
              }
              onSetWinner={(id, slot) => void state.setMatchWinner(id, slot)}
              onAssignTeam={(id, slot, team) =>
                void state.assignBracketTeam(id, slot, team)
              }
              onReshuffleBracket={() => void state.reshuffleBracket(selected.id)}
              onResultSaved={() => void state.reload()}
              onError={(message) => state.setError(message)}
            />
            )
          ) : null}
        </StageDetailTabs>
      ) : null}

      {!selected && !wizardOpen ? (
        <p className="rounded-2xl bg-white/[0.02] px-5 py-10 text-center text-sm text-white/35">
          Select a stage or add a new one to get started.
        </p>
      ) : null}
    </div>
  );
}
