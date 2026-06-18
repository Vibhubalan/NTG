import { describe, expect, it } from "vitest";
import { emptyToNull, normalizeOptionalString, prizeSplitForSave } from "@/lib/admin-fields";

describe("admin-fields", () => {
  it("emptyToNull clears whitespace-only strings", () => {
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull("   ")).toBeNull();
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull("Player1")).toBe("Player1");
  });

  it("normalizeOptionalString preserves undefined", () => {
    expect(normalizeOptionalString(undefined)).toBeUndefined();
    expect(normalizeOptionalString("")).toBeNull();
  });

  it("prizeSplitForSave returns null when prize pool is cleared", () => {
    const defaultSplit = (total: number) => [{ place: 1, label: "Winner", amount: total }];
    expect(prizeSplitForSave(null, [{ place: 1, label: "Winner", amount: 100 }], defaultSplit)).toBeNull();
    expect(prizeSplitForSave("", null, defaultSplit)).toBeNull();
  });

  it("prizeSplitForSave drops rows with empty labels or zero amounts", () => {
    const defaultSplit = (total: number) => [{ place: 1, label: "Winner", amount: total }];
    expect(
      prizeSplitForSave("1000", [{ place: 1, label: "  ", amount: 500 }], defaultSplit),
    ).toBeNull();
  });
});
