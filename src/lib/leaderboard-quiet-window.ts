/**
 * Leaderboard hourly sync quiet window: 4:00–5:59 AM Asia/Kolkata (IST).
 * Sync window is 6:00 AM → 3:59 AM next day.
 */
export function isLeaderboardQuietWindowIst(now: Date = new Date()): boolean {
  const hourRaw = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now).find((p) => p.type === "hour")?.value;

  const hour = Number.parseInt(hourRaw ?? "0", 10);
  if (!Number.isFinite(hour)) return false;
  // en-GB can yield "24" for midnight in some engines — normalize.
  const h = hour === 24 ? 0 : hour;
  return h === 4 || h === 5;
}
