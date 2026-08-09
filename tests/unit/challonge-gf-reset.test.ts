import { describe, expect, it } from "vitest";
import { isDuplicateGrandFinalReset } from "@/lib/challonge-api";

describe("isDuplicateGrandFinalReset", () => {
  it("hides a completed GF reset that copies the first GF scoreline", () => {
    expect(
      isDuplicateGrandFinalReset(
        {
          state: "complete",
          scoresCsv: "1-2",
          player1Id: 2,
          player2Id: 3,
          player1PrereqId: 10,
          player2PrereqId: 10,
        },
        {
          state: "complete",
          scoresCsv: "1-2",
          player1Id: 2,
          player2Id: 3,
        },
      ),
    ).toBe(true);
  });

  it("keeps a real GF reset with a different result", () => {
    expect(
      isDuplicateGrandFinalReset(
        {
          state: "complete",
          scoresCsv: "2-0",
          player1Id: 2,
          player2Id: 3,
          player1PrereqId: 10,
          player2PrereqId: 10,
        },
        {
          state: "complete",
          scoresCsv: "1-2",
          player1Id: 2,
          player2Id: 3,
        },
      ),
    ).toBe(false);
  });

  it("keeps incomplete resets (handled separately as optional)", () => {
    expect(
      isDuplicateGrandFinalReset(
        {
          state: "pending",
          scoresCsv: "1-2",
          player1Id: 2,
          player2Id: 3,
          player1PrereqId: 10,
          player2PrereqId: 10,
        },
        {
          state: "complete",
          scoresCsv: "1-2",
          player1Id: 2,
          player2Id: 3,
        },
      ),
    ).toBe(false);
  });
});
