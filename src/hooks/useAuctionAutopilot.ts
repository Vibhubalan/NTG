"use client";

import { useEffect, useRef, useState } from "react";

type AutopilotSession = {
  id: string;
  status: string;
  timerEndsAt: string | null;
  currentPlayer: { id: string } | null;
  poolCount: number;
  soldCount?: number;
  unsoldCount: number;
} | null;

async function fire(sessionId: string, path: string, method: "POST" | "PATCH", body?: unknown) {
  try {
    await fetch(`/api/auction/sessions/${sessionId}/${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // network hiccup — next tick retries
  }
}

/**
 * Drives the auction end-to-end with no manual clicks:
 *  - nominates the next player when the block is empty,
 *  - hammers (sells / marks unsold) the moment the timer runs out,
 *  - completes the auction once the pool is exhausted.
 * Runs entirely from whichever admin screen has it toggled on.
 */
export function useAuctionAutopilot({
  enabled,
  session,
  onActed,
}: {
  enabled: boolean;
  session: AutopilotSession;
  onActed: () => void;
}) {
  const sessionRef = useRef(session);
  const enabledRef = useRef(enabled);
  const busyRef = useRef(false);
  const cooldownRef = useRef(0);
  const [lastAction, setLastAction] = useState<string | null>(null);

  sessionRef.current = session;
  enabledRef.current = enabled;

  useEffect(() => {
    const tick = async () => {
      if (!enabledRef.current || busyRef.current) return;
      if (Date.now() < cooldownRef.current) return;
      const s = sessionRef.current;
      if (!s) return;

      const status = s.status.toUpperCase();
      if (status === "PAUSED" || status === "COMPLETE") return;

      const timerExpired = s.timerEndsAt ? new Date(s.timerEndsAt).getTime() <= Date.now() : false;

      let action: null | { path: string; method: "POST" | "PATCH"; label: string } = null;

      if (status === "LIVE" && s.currentPlayer && timerExpired) {
        action = { path: "sell", method: "POST", label: "Hammered player" };
      } else if (!s.currentPlayer && s.poolCount > 0) {
        action = { path: "nominate", method: "POST", label: "Nominated next player" };
      } else if (
        !s.currentPlayer &&
        s.poolCount === 0 &&
        (s.soldCount ?? 0) + s.unsoldCount > 0
      ) {
        action = { path: "status", method: "PATCH", label: "Auction complete" };
      }

      if (!action) return;

      busyRef.current = true;
      try {
        if (action.path === "status") {
          await fire(s.id, "status", "PATCH", { status: "COMPLETE" });
        } else {
          await fire(s.id, action.path, "POST");
        }
        setLastAction(action.label);
        onActed();
      } finally {
        cooldownRef.current = Date.now() + 900;
        busyRef.current = false;
      }
    };

    const id = setInterval(() => void tick(), 1000);
    return () => clearInterval(id);
    // onActed is stable enough; we intentionally read live values via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { lastAction };
}
