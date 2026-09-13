/** Parse YYYY-MM-DD as midnight IST (matches tournament/roster date inputs). */
export function parseIstDateInput(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+05:30`);
}

/** Parse YYYY-MM-DD as end of that calendar day in IST (inclusive close dates). */
export function parseIstDateInputEndOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+05:30`);
}

export function formatIstDateInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
