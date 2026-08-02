/** Browser-side warm of cup tab APIs so Brackets / Matches / Stats are ready on open. */

import type { TournamentBracketView } from "@core/contracts/tournament-bracket";
import type { TournamentStatsEligibility } from "@/lib/tournament-stats";

export type CupBracketsPayload = {
  brackets: {
    url: string;
    name?: string | null;
    isFinal?: boolean;
    bracket: TournamentBracketView | null;
  }[];
};

export type CupGamesPayload = {
  games: unknown[];
  statsEligibility?: TournamentStatsEligibility;
  yourGamesEnabled?: boolean;
};

const bracketsInflight = new Map<string, Promise<CupBracketsPayload | null>>();
const gamesInflight = new Map<string, Promise<CupGamesPayload | null>>();

export function loadTournamentBrackets(
  slug: string,
): Promise<CupBracketsPayload | null> {
  const key = slug.trim();
  if (!key) return Promise.resolve(null);

  const existing = bracketsInflight.get(key);
  if (existing) return existing;

  const promise = fetch(`/api/tournaments/${encodeURIComponent(key)}/brackets`)
    .then(async (res) => {
      if (!res.ok) return null;
      return (await res.json()) as CupBracketsPayload;
    })
    .catch(() => null);

  bracketsInflight.set(key, promise);
  return promise;
}

export function loadTournamentGames(slug: string): Promise<CupGamesPayload | null> {
  const key = slug.trim();
  if (!key) return Promise.resolve(null);

  const existing = gamesInflight.get(key);
  if (existing) return existing;

  const promise = fetch(`/api/tournaments/${encodeURIComponent(key)}/games`)
    .then(async (res) => {
      if (!res.ok) return null;
      return (await res.json()) as CupGamesPayload;
    })
    .catch(() => null);

  gamesInflight.set(key, promise);
  return promise;
}

/** Start warming without awaiting — safe on link hover / focus. */
export function prefetchTournamentCupApis(slug: string): void {
  if (typeof window === "undefined") return;
  const key = slug.trim();
  if (!key) return;
  void loadTournamentBrackets(key);
  void loadTournamentGames(key);
}
