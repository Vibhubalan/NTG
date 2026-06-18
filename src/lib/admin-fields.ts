import type { PrizeSplitRow } from "@core/contracts";

/** Trim strings; empty or whitespace-only becomes null (clears stored value). */
export function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Normalize optional string fields on PATCH bodies: "" → null, preserve undefined. */
export function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  return emptyToNull(value);
}

/** ISO datetime fields: null clears, undefined skips update. */
export function normalizeOptionalDateTime(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  return emptyToNull(value);
}

export function prizeSplitForSave(
  prizePool: string | null,
  prizeSplit: PrizeSplitRow[] | null,
  defaultSplit: (total: number) => PrizeSplitRow[],
): PrizeSplitRow[] | null {
  if (!prizePool || !Number(prizePool)) return null;

  const total = Number(prizePool);
  const source = prizeSplit?.length ? prizeSplit : defaultSplit(total);
  const rows = source
    .filter(
      (row) =>
        row.label.trim() !== "" && Number.isFinite(row.amount) && row.amount > 0,
    )
    .map((row) => ({ ...row, label: row.label.trim() }));

  return rows.length > 0 ? rows : null;
}
