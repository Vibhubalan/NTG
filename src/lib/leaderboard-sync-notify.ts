import { Resend } from "resend";
import { serverEnv } from "@core/config/env.server";

export type LeaderboardSyncNotifyPayload = {
  runStartedAt: Date;
  finishedAt: Date;
  synced: number;
  failed: number;
  skipped: number;
  batches: number;
  pending: number;
  status: "ok" | "error";
  errorMessage?: string;
};

function parseNotifyEnabled(raw: string | undefined): boolean {
  if (!raw) return false;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

export function isLeaderboardSyncNotifyEnabled(): boolean {
  return parseNotifyEnabled(process.env.LEADERBOARD_SYNC_NOTIFY);
}

export function getLeaderboardSyncNotifyEmail(): string | null {
  const explicit = process.env.LEADERBOARD_SYNC_NOTIFY_EMAIL?.trim().toLowerCase();
  if (explicit) return explicit;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails[0] ?? null;
}

function formatDurationMs(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}

function buildEmailHtml(payload: LeaderboardSyncNotifyPayload, siteUrl: string): string {
  const duration = formatDurationMs(
    payload.finishedAt.getTime() - payload.runStartedAt.getTime(),
  );
  const statusLabel = payload.status === "ok" ? "Completed" : "Failed";
  const statusColor = payload.status === "ok" ? "#22c55e" : "#ef4444";

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 8px">NTG leaderboard rank sync</h2>
      <p style="margin:0 0 20px;color:${statusColor};font-weight:600">${statusLabel}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#666">Started (UTC)</td><td style="padding:6px 0">${payload.runStartedAt.toISOString()}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Finished (UTC)</td><td style="padding:6px 0">${payload.finishedAt.toISOString()}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Duration</td><td style="padding:6px 0">${duration}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Batches</td><td style="padding:6px 0">${payload.batches}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Synced</td><td style="padding:6px 0">${payload.synced}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Skipped</td><td style="padding:6px 0">${payload.skipped}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Failed</td><td style="padding:6px 0">${payload.failed}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Still pending</td><td style="padding:6px 0">${payload.pending}</td></tr>
      </table>
      ${
        payload.errorMessage
          ? `<p style="margin:16px 0 0;padding:12px;background:#fef2f2;border-radius:8px;color:#991b1b;font-size:13px">${payload.errorMessage}</p>`
          : ""
      }
      <p style="margin:24px 0 0">
        <a href="${siteUrl}/esports/leaderboard" style="color:#0891b2">View leaderboard</a>
      </p>
      <p style="margin:24px 0 0;color:#888;font-size:12px">
        Daily cron: Vercel <code>/api/cron/sync-ranks</code>. Disable with LEADERBOARD_SYNC_NOTIFY=0.
      </p>
    </div>
  `;
}

export async function notifyLeaderboardSyncComplete(
  payload: LeaderboardSyncNotifyPayload,
): Promise<{ sent: boolean; reason?: string }> {
  if (!isLeaderboardSyncNotifyEnabled()) {
    return { sent: false, reason: "notify_disabled" };
  }

  const to = getLeaderboardSyncNotifyEmail();
  if (!to) {
    console.warn("[leaderboard-sync-notify] LEADERBOARD_SYNC_NOTIFY is on but no recipient email.");
    return { sent: false, reason: "no_recipient" };
  }

  const apiKey = serverEnv.resendApiKey;
  const from = serverEnv.emailFrom;
  if (!apiKey || !from) {
    console.warn("[leaderboard-sync-notify] Resend not configured (RESEND_API_KEY / EMAIL_FROM).");
    return { sent: false, reason: "resend_not_configured" };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    serverEnv.authUrl ??
    "https://www.ntgesports.com";

  const subject =
    payload.status === "ok"
      ? `NTG leaderboard sync completed (${payload.synced} updated)`
      : "NTG leaderboard sync failed";

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: buildEmailHtml(payload, siteUrl.replace(/\/$/, "")),
  });

  if (error) {
    console.error("[leaderboard-sync-notify] Resend error:", error.message);
    return { sent: false, reason: error.message };
  }

  console.info(`[leaderboard-sync-notify] Sent to ${to}`);
  return { sent: true };
}
