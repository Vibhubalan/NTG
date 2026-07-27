"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AuctionClientState = Record<string, unknown> | null;

export function useAuctionChannel(tournamentSlug: string) {
  const [state, setState] = useState<AuctionClientState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);
  const mountedRef = useRef(true);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/auction/tournaments/${tournamentSlug}/state`, {
          cache: "no-store",
          signal,
        });
        const data = await res.json();
        if (!mountedRef.current || signal?.aborted) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to load auction.");
          return;
        }
        setError(null);
        const nextVersion = (data.session as { version?: number } | null)?.version ?? 0;
        if (nextVersion >= versionRef.current) {
          versionRef.current = nextVersion;
          setState(data.session);
        }
        setLoading(false);
      } catch (err) {
        if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        if (mountedRef.current) setError("Connection lost — retrying…");
      }
    },
    [tournamentSlug],
  );

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    void refresh(controller.signal);
    const poll = setInterval(() => void refresh(controller.signal), 3000);

    return () => {
      mountedRef.current = false;
      controller.abort();
      clearInterval(poll);
    };
  }, [tournamentSlug, refresh]);

  return { state, loading, error, refresh };
}
