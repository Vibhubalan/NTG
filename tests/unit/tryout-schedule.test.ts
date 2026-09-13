import { describe, expect, it } from "vitest";
import {
  computeTryoutListingStatus,
  resolveTryoutClosesAt,
} from "@roster-listings/domain/tryout-schedule";
import { parseIstDateInput, parseIstDateInputEndOfDay } from "@/lib/ist-date-input";

describe("tryout-schedule reopen", () => {
  const base = {
    type: "ROSTER_TRYOUT" as const,
    status: "CLOSED" as const,
    autoManageTryout: true,
    tryoutOpensAt: new Date("2026-09-01T00:00:00+05:30"),
    tryoutClosesAt: new Date("2026-09-10T00:00:00+05:30"),
    tryoutOpenDays: null,
    tryoutRepeatDays: null,
  };

  it("stays closed after the close date", () => {
    expect(computeTryoutListingStatus(base, new Date("2026-09-13T12:00:00+05:30"))).toBe("CLOSED");
  });

  it("reopens when close date is extended into the future", () => {
    const extended = {
      ...base,
      tryoutClosesAt: parseIstDateInputEndOfDay("2026-09-20"),
    };
    expect(computeTryoutListingStatus(extended, new Date("2026-09-13T12:00:00+05:30"))).toBe(
      "OPEN",
    );
  });

  it("treats end-of-day close as inclusive for the selected date", () => {
    const closes = parseIstDateInputEndOfDay("2026-09-13");
    expect(resolveTryoutClosesAt(base.tryoutOpensAt, closes, null)?.getTime()).toBe(
      closes.getTime(),
    );
    expect(
      computeTryoutListingStatus(
        { ...base, tryoutClosesAt: closes },
        new Date("2026-09-13T18:00:00+05:30"),
      ),
    ).toBe("OPEN");
    expect(
      computeTryoutListingStatus(
        { ...base, tryoutClosesAt: parseIstDateInput("2026-09-13") },
        new Date("2026-09-13T18:00:00+05:30"),
      ),
    ).toBe("CLOSED");
  });
});
