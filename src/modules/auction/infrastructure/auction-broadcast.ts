import { serverEnv } from "@core/config/env.server";

export type AuctionBroadcastPayload = {
  tournamentSlug: string;
  sessionId: string;
  version: number;
  at: string;
};

/** Server-side Supabase Realtime Broadcast (optional — no-op when env missing). */
export async function broadcastAuctionEvent(
  tournamentSlug: string,
  payload: Omit<AuctionBroadcastPayload, "tournamentSlug" | "at"> & { at?: string },
): Promise<void> {
  const url = serverEnv.supabaseUrl;
  const key = serverEnv.supabaseServiceRoleKey;
  if (!url || !key) return;

  const channel = `auction:${tournamentSlug}`;
  const body = {
    messages: [
      {
        topic: channel,
        event: "state",
        payload: {
          tournamentSlug,
          sessionId: payload.sessionId,
          version: payload.version,
          at: payload.at ?? new Date().toISOString(),
        },
      },
    ],
  };

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Realtime is best-effort; clients fall back to polling.
  }
}
