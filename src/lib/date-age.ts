/** Compute age in full years from a date-only ISO string or Date. */
export function computeAgeFromDateOfBirth(
  dateOfBirth: string | Date | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null;

  const birth =
    typeof dateOfBirth === "string"
      ? new Date(`${dateOfBirth.slice(0, 10)}T00:00:00`)
      : dateOfBirth;

  if (Number.isNaN(birth.getTime())) return null;

  let age = asOf.getFullYear() - birth.getFullYear();
  const monthDiff = asOf.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= 0 && age <= 120 ? age : null;
}

export function formatDateOfBirthDisplay(
  dateOfBirth: string | Date | null | undefined,
): string | null {
  if (!dateOfBirth) return null;
  const iso =
    typeof dateOfBirth === "string"
      ? dateOfBirth.slice(0, 10)
      : dateOfBirth.toISOString().slice(0, 10);
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}
