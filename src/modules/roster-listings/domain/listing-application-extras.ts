export function isMissingListingApplicationExtrasColumn(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = String((error as { message?: string })?.message ?? error);
  if (code === "P2022") return true;
  return /pastExperience|resumeUrl/i.test(message) && /does not exist/i.test(message);
}
