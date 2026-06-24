/** Superadmin identity — can change platform settings and sensitive admin actions. */
export function getSuperAdminEmail(): string {
  return (process.env.SUPERADMIN_EMAIL ?? "vibhubalan123@gmail.com").trim().toLowerCase();
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getSuperAdminEmail();
}
