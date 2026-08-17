"use client";

import { useMemo, useState } from "react";
import type { ListingFormFieldView } from "@core/contracts/roster-listings";
import { isGridField, isListingInputField } from "@/modules/roster-listings/domain/listing-form";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2 text-sm text-white placeholder:text-white/30";

const FIELD_TYPE_OPTIONS: { value: ListingFormFieldView["fieldType"]; label: string; hint: string }[] = [
  { value: "SECTION_HEADING", label: "Section heading", hint: "Visual section divider" },
  { value: "DESCRIPTION", label: "Description", hint: "Instructions block (no input)" },
  { value: "SHORT_TEXT", label: "Short answer", hint: "Single-line text" },
  { value: "LONG_TEXT", label: "Paragraph", hint: "Multi-line text" },
  { value: "SINGLE_CHOICE", label: "Multiple choice", hint: "Select one (radio)" },
  { value: "MULTIPLE_CHOICE", label: "Checkboxes", hint: "Select multiple" },
  { value: "DROPDOWN", label: "Dropdown", hint: "Select one from menu" },
  { value: "LINEAR_SCALE", label: "Linear scale", hint: "Rating scale (e.g. 1-5)" },
  { value: "MULTIPLE_CHOICE_GRID", label: "Multiple choice grid", hint: "One selection per row" },
  { value: "CHECKBOX_GRID", label: "Checkbox grid", hint: "Multiple selections per row" },
  { value: "DATE", label: "Date", hint: "Date picker" },
  { value: "TIME", label: "Time", hint: "Time picker" },
  { value: "FILE_UPLOAD", label: "File upload", hint: "Excel, Word, PDF, or image (max 15 MB)" },
];

type DraftField = {
  clientId: string;
  sortOrder: number;
  fieldType: ListingFormFieldView["fieldType"];
  label: string;
  helpText: string;
  required: boolean;
  options: string[];
  scaleMin: number;
  scaleMax: number;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  gridRows: string[];
  gridColumns: string[];
};

type Props = {
  slug: string;
  listingType: "JOB" | "ROSTER_TRYOUT";
  initialFields: ListingFormFieldView[];
};

function toDraft(field: ListingFormFieldView, index: number): DraftField {
  return {
    clientId: field.id,
    sortOrder: index,
    fieldType: field.fieldType,
    label: field.label,
    helpText: field.helpText ?? "",
    required: field.required,
    options: field.options.length > 0 ? field.options : ["Option 1", "Option 2"],
    scaleMin: field.scaleMin,
    scaleMax: field.scaleMax,
    scaleMinLabel: field.scaleMinLabel ?? "",
    scaleMaxLabel: field.scaleMaxLabel ?? "",
    gridRows: field.gridRows.length > 0 ? field.gridRows : ["Row 1"],
    gridColumns: field.gridColumns.length > 0 ? field.gridColumns : ["Column 1", "Column 2"],
  };
}

function newDraft(fieldType: ListingFormFieldView["fieldType"], sortOrder: number): DraftField {
  const isChoice = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(fieldType);
  const isGrid = isGridField(fieldType);
  return {
    clientId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sortOrder,
    fieldType,
    label:
      fieldType === "SECTION_HEADING"
        ? "New section"
        : fieldType === "DESCRIPTION"
          ? "Instructions"
          : "Question",
    helpText: "",
    required: isListingInputField(fieldType) && fieldType !== "FILE_UPLOAD",
    options: isChoice ? ["Option 1", "Option 2"] : [],
    scaleMin: 1,
    scaleMax: 5,
    scaleMinLabel: "",
    scaleMaxLabel: "",
    gridRows: isGrid ? ["Row 1"] : [],
    gridColumns: isGrid ? ["Column 1", "Column 2"] : [],
  };
}

function serializeDraft(fields: DraftField[]) {
  return fields.map((f, index) => ({
    sortOrder: index,
    fieldType: f.fieldType,
    label: f.label.trim(),
    helpText: f.helpText.trim() || null,
    required: isListingInputField(f.fieldType) ? f.required : false,
    options: ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(f.fieldType)
      ? f.options.map((o) => o.trim()).filter(Boolean)
      : undefined,
    scaleMin: f.fieldType === "LINEAR_SCALE" ? f.scaleMin : undefined,
    scaleMax: f.fieldType === "LINEAR_SCALE" ? f.scaleMax : undefined,
    scaleMinLabel: f.fieldType === "LINEAR_SCALE" ? f.scaleMinLabel.trim() || null : undefined,
    scaleMaxLabel: f.fieldType === "LINEAR_SCALE" ? f.scaleMaxLabel.trim() || null : undefined,
    gridRows: isGridField(f.fieldType) ? f.gridRows.map((r) => r.trim()).filter(Boolean) : undefined,
    gridColumns: isGridField(f.fieldType) ? f.gridColumns.map((c) => c.trim()).filter(Boolean) : undefined,
  }));
}

export default function AdminListingFormBuilder({ slug, listingType, initialFields }: Props) {
  const [fields, setFields] = useState<DraftField[]>(() =>
    initialFields.length > 0 ? initialFields.map(toDraft) : [],
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(serializeDraft(initialFields.length > 0 ? initialFields.map(toDraft) : [])),
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(serializeDraft(fields)) !== savedSnapshot,
    [fields, savedSnapshot],
  );

  function updateField(clientId: string, patch: Partial<DraftField>) {
    setFields((prev) => prev.map((f) => (f.clientId === clientId ? { ...f, ...patch } : f)));
  }

  function moveField(clientId: string, direction: -1 | 1) {
    setFields((prev) => {
      const index = prev.findIndex((f) => f.clientId === clientId);
      if (index < 0) return prev;
      const next = index + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy.map((f, i) => ({ ...f, sortOrder: i }));
    });
  }

  function removeField(clientId: string) {
    setFields((prev) =>
      prev.filter((f) => f.clientId !== clientId).map((f, i) => ({ ...f, sortOrder: i })),
    );
  }

  function addField(fieldType: ListingFormFieldView["fieldType"]) {
    setFields((prev) => [...prev, newDraft(fieldType, prev.length)]);
  }

  async function loadTemplate() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/listings/${slug}/fields/template?type=${listingType}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not load template.");
      return;
    }
    const next = (data.fields as ListingFormFieldView[]).map((f, i) => toDraft({ ...f, id: `tpl-${i}` }, i));
    setFields(next);
    setMessage("Template loaded. Save to apply.");
  }

  async function save() {
    if (!isDirty || loading) return;
    setLoading(true);
    setMessage(null);
    setError(null);

    const res = await fetch(`/api/admin/listings/${slug}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: serializeDraft(fields) }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Save failed.");
      return;
    }

    const saved = (data.fields as ListingFormFieldView[]).map(toDraft);
    setFields(saved);
    setSavedSnapshot(JSON.stringify(serializeDraft(saved)));
    setMessage("Application form saved.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-xl border border-white/10 bg-[#0a1020]/60 px-3 py-2 text-xs text-white"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as ListingFormFieldView["fieldType"];
            if (v) {
              addField(v);
              e.target.value = "";
            }
          }}
        >
          <option value="">+ Add field…</option>
          {FIELD_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.hint}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadTemplate}
          disabled={loading}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.04] disabled:opacity-50"
        >
          Load {listingType === "JOB" ? "job" : "tryout"} template
        </button>
        <button
          type="button"
          onClick={save}
          disabled={loading || !isDirty}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
            isDirty
              ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
              : "border border-white/10 bg-white/[0.03] text-white/30 cursor-not-allowed"
          }`}
        >
          {loading ? "Saving…" : "Save form"}
        </button>
      </div>

      {message ? <p className="text-sm text-emerald-300/90">{message}</p> : null}
      {error ? <p className="text-sm text-red-400/90">{error}</p> : null}

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
          No fields yet. Add questions or load a template to build the application form.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.clientId}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                  {FIELD_TYPE_OPTIONS.find((o) => o.value === field.fieldType)?.label}
                </span>
                <div className="flex gap-1">
                  <button type="button" disabled={index === 0} onClick={() => moveField(field.clientId, -1)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/50 disabled:opacity-30">↑</button>
                  <button type="button" disabled={index === fields.length - 1} onClick={() => moveField(field.clientId, 1)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/50 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => removeField(field.clientId)} className="rounded-lg border border-rose-500/20 px-2 py-1 text-[10px] text-rose-300">Remove</button>
                </div>
              </div>

              <input className={inputClass} value={field.label} onChange={(e) => updateField(field.clientId, { label: e.target.value })} placeholder="Label" />

              {(field.fieldType === "DESCRIPTION" || isListingInputField(field.fieldType)) ? (
                <textarea className={`${inputClass} min-h-12 resize-y`} value={field.helpText} onChange={(e) => updateField(field.clientId, { helpText: e.target.value })} placeholder="Help text (optional)" />
              ) : null}

              {isListingInputField(field.fieldType) ? (
                <label className="flex items-center gap-2 text-xs text-white/55">
                  <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.clientId, { required: e.target.checked })} />
                  Required
                </label>
              ) : null}

              {["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(field.fieldType) ? (
                <OptionList field={field} onChange={(options) => updateField(field.clientId, { options })} />
              ) : null}

              {field.fieldType === "LINEAR_SCALE" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input type="number" className={inputClass} value={field.scaleMin} onChange={(e) => updateField(field.clientId, { scaleMin: Number(e.target.value) })} placeholder="Min" />
                  <input type="number" className={inputClass} value={field.scaleMax} onChange={(e) => updateField(field.clientId, { scaleMax: Number(e.target.value) })} placeholder="Max" />
                  <input className={inputClass} value={field.scaleMinLabel} onChange={(e) => updateField(field.clientId, { scaleMinLabel: e.target.value })} placeholder="Min label" />
                  <input className={inputClass} value={field.scaleMaxLabel} onChange={(e) => updateField(field.clientId, { scaleMaxLabel: e.target.value })} placeholder="Max label" />
                </div>
              ) : null}

              {isGridField(field.fieldType) ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <OptionList label="Rows" field={{ ...field, options: field.gridRows }} onChange={(gridRows) => updateField(field.clientId, { gridRows })} />
                  <OptionList label="Columns" field={{ ...field, options: field.gridColumns }} onChange={(gridColumns) => updateField(field.clientId, { gridColumns })} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OptionList({
  label = "Options",
  field,
  onChange,
}: {
  label?: string;
  field: { options: string[] };
  onChange: (options: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-white/35">{label}</p>
      {field.options.map((opt, optIndex) => (
        <div key={optIndex} className="flex gap-2">
          <input
            className={inputClass}
            value={opt}
            onChange={(e) => {
              const next = [...field.options];
              next[optIndex] = e.target.value;
              onChange(next);
            }}
          />
          <button type="button" onClick={() => onChange(field.options.filter((_, i) => i !== optIndex))} className="shrink-0 rounded-lg border border-white/10 px-2 text-xs text-white/40">×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...field.options, `${label === "Rows" ? "Row" : label === "Columns" ? "Column" : "Option"} ${field.options.length + 1}`])} className="text-xs text-emerald-200/80 hover:underline">+ Add</button>
    </div>
  );
}
