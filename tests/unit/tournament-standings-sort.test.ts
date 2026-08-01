import { describe, expect, it } from "vitest";

describe("tournament group standings sort", () => {
  it("preserves explicit rank order over total game score", () => {
    const standings = [
      { rank: 3, name: "BIKARNAKATTE", pts: 57, ptsDiff: 3, setWins: 2 },
      { rank: 1, name: "BAJIL", pts: 53, ptsDiff: 13, setWins: 3 },
      { rank: 2, name: "XVAMOS", pts: 47, ptsDiff: 12, setWins: 3 },
      { rank: 4, name: "KULSHEKARA", pts: 41, ptsDiff: -2, setWins: 2 },
      { rank: 5, name: "NARMINISTAN", pts: 28, ptsDiff: -26, setWins: 0 },
    ];

    standings.sort((a, b) => {
      if (a.rank > 0 && b.rank > 0 && a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      if (a.rank > 0 && (!b.rank || b.rank === 0)) return -1;
      if (b.rank > 0 && (!a.rank || a.rank === 0)) return 1;
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.ptsDiff !== a.ptsDiff) return b.ptsDiff - a.ptsDiff;
      if (b.setWins !== a.setWins) return b.setWins - a.setWins;
      return 0;
    });

    expect(standings.map((s) => s.name)).toEqual([
      "BAJIL",
      "XVAMOS",
      "BIKARNAKATTE",
      "KULSHEKARA",
      "NARMINISTAN",
    ]);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});
