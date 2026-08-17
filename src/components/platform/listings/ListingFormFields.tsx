"use client";

import { useState } from "react";
import type { ListingFormFieldView, ListingFormResponses } from "@core/contracts/roster-listings";
import { isGridField } from "@/modules/roster-listings/domain/listing-form";

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none transition-colors";

const labelClass = "block text-sm font-medium text-white/85 mb-1.5";

type Props = {
  fields: ListingFormFieldView[];
  values: ListingFormResponses;
  onChange: (fieldId: string, value: string | string[] | Record<string, string | string[]>) => void;
  disabled?: boolean;
};

export default function ListingFormFields({ fields, values, onChange, disabled }: Props) {
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadFile(fieldId: string, file: File) {
    setUploadingField(fieldId);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/listings/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed.");
        return;
      }
      onChange(fieldId, data.url as string);
    } catch {
      setUploadError("Upload failed.");
    } finally {
      setUploadingField(null);
    }
  }

  if (fields.length === 0) {
    return (
      <p className="text-sm text-white/45">
        No additional questions for this listing.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {fields.map((field) => {
        if (field.fieldType === "SECTION_HEADING") {
          return (
            <div key={field.id} className="border-t border-white/[0.08] pt-8 first:border-t-0 first:pt-0">
              <h2 className="font-display text-xl font-semibold text-white">{field.label}</h2>
            </div>
          );
        }

        if (field.fieldType === "DESCRIPTION") {
          return (
            <div key={field.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              {field.label ? (
                <p className="text-sm font-medium text-white/70 mb-1">{field.label}</p>
              ) : null}
              {field.helpText ? (
                <p className="text-sm leading-relaxed text-white/50">{field.helpText}</p>
              ) : null}
            </div>
          );
        }

        const value = values[field.id];

        return (
          <div key={field.id}>
            <label className={labelClass}>
              {field.label}
              {field.required ? <span className="text-rose-400 ml-1">*</span> : null}
            </label>
            {field.helpText ? (
              <p className="mb-2 text-xs leading-relaxed text-white/40">{field.helpText}</p>
            ) : null}

            {field.fieldType === "SHORT_TEXT" ? (
              <input
                type="text"
                className={inputClass}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                disabled={disabled}
                maxLength={500}
              />
            ) : null}

            {field.fieldType === "LONG_TEXT" ? (
              <textarea
                className={`${inputClass} min-h-[7rem] resize-y`}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                disabled={disabled}
                maxLength={6000}
              />
            ) : null}

            {field.fieldType === "DATE" ? (
              <input
                type="date"
                className={inputClass}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                disabled={disabled}
              />
            ) : null}

            {field.fieldType === "TIME" ? (
              <input
                type="time"
                className={inputClass}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                disabled={disabled}
              />
            ) : null}

            {field.fieldType === "DROPDOWN" ? (
              <select
                className={inputClass}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(field.id, e.target.value)}
                disabled={disabled}
              >
                <option value="">Select an option</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : null}

            {field.fieldType === "SINGLE_CHOICE" ? (
              <div className="space-y-2">
                {field.options.map((opt) => (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white/75 hover:border-white/12"
                  >
                    <input
                      type="radio"
                      name={field.id}
                      value={opt}
                      checked={value === opt}
                      onChange={() => onChange(field.id, opt)}
                      disabled={disabled}
                      className="accent-[var(--color-brand)]"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : null}

            {field.fieldType === "MULTIPLE_CHOICE" ? (
              <div className="space-y-2">
                {field.options.map((opt) => {
                  const selected = Array.isArray(value) ? value : [];
                  const checked = selected.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white/75 hover:border-white/12"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? selected.filter((v) => v !== opt)
                            : [...selected, opt];
                          onChange(field.id, next);
                        }}
                        disabled={disabled}
                        className="accent-[var(--color-brand)]"
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            ) : null}

            {field.fieldType === "LINEAR_SCALE" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{field.scaleMinLabel ?? field.scaleMin}</span>
                  <span>{field.scaleMaxLabel ?? field.scaleMax}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: field.scaleMax - field.scaleMin + 1 }, (_, i) => {
                    const n = String(field.scaleMin + i);
                    return (
                      <label
                        key={n}
                        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border text-sm ${
                          value === n
                            ? "border-[var(--color-brand)] bg-[var(--color-brand)]/15 text-white"
                            : "border-white/10 text-white/60 hover:border-white/20"
                        }`}
                      >
                        <input
                          type="radio"
                          name={field.id}
                          value={n}
                          checked={value === n}
                          onChange={() => onChange(field.id, n)}
                          disabled={disabled}
                          className="sr-only"
                        />
                        {n}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {isGridField(field.fieldType) ? (
              <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-3 py-2 text-white/40" />
                      {field.gridColumns.map((col) => (
                        <th key={col} className="px-3 py-2 text-xs font-medium text-white/55">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {field.gridRows.map((row) => {
                      const gridValue =
                        value && typeof value === "object" && !Array.isArray(value)
                          ? value
                          : {};
                      return (
                        <tr key={row} className="border-b border-white/[0.04]">
                          <td className="px-3 py-2 text-white/70">{row}</td>
                          {field.gridColumns.map((col) => (
                            <td key={col} className="px-3 py-2 text-center">
                              {field.fieldType === "MULTIPLE_CHOICE_GRID" ? (
                                <input
                                  type="radio"
                                  name={`${field.id}-${row}`}
                                  checked={gridValue[row] === col}
                                  onChange={() => onChange(field.id, { ...gridValue, [row]: col })}
                                  disabled={disabled}
                                  className="accent-[var(--color-brand)]"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={
                                    Array.isArray(gridValue[row])
                                      ? gridValue[row].includes(col)
                                      : false
                                  }
                                  onChange={() => {
                                    const current = Array.isArray(gridValue[row]) ? gridValue[row] : [];
                                    const next = current.includes(col)
                                      ? current.filter((c) => c !== col)
                                      : [...current, col];
                                    onChange(field.id, { ...gridValue, [row]: next });
                                  }}
                                  disabled={disabled}
                                  className="accent-[var(--color-brand)]"
                                />
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {field.fieldType === "FILE_UPLOAD" ? (
              <div className="space-y-2">
                <p className="text-xs text-white/35">
                  Excel (.xls, .xlsx), Word, PDF, or images. Max 15 MB.
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                  disabled={disabled || uploadingField === field.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadFile(field.id, file);
                  }}
                  className="block w-full text-sm text-white/55 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white/80"
                />
                {typeof value === "string" && value ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--color-brand)] hover:underline"
                  >
                    View uploaded file
                  </a>
                ) : null}
                {uploadingField === field.id ? (
                  <p className="text-xs text-white/40">Uploading…</p>
                ) : null}
                {uploadError && uploadingField === null ? (
                  <p className="text-xs text-red-400/90">{uploadError}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
