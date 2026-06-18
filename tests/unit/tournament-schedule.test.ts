import type { TournamentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  computeAutoStatus,
  getRegistrationCloseAt,
  hasValidAutoSchedule,
  isTournamentRegistrationLive,
  validateAutoSchedule,
} from "@tournaments-leagues/domain/tournament-schedule";

const base = {
  status: "REGISTRATION_OPEN" as TournamentStatus,
  autoManageStatus: true,
  registrationOpensAt: new Date("2026-06-01T10:00:00Z"),
  startsAt: new Date("2026-06-10T10:00:00Z"),
  endsAt: new Date("2026-06-10T18:00:00Z"),
};

describe("tournament-schedule", () => {
  it("closes registration 1 minute before start", () => {
    const close = getRegistrationCloseAt(base.startsAt!);
    expect(close.getTime()).toBe(base.startsAt!.getTime() - 60_000);
  });

  it("validates auto schedule ordering", () => {
    expect(validateAutoSchedule(base)).toBeNull();
    expect(
      validateAutoSchedule({
        registrationOpensAt: base.startsAt,
        startsAt: base.registrationOpensAt,
        endsAt: base.endsAt,
      }),
    ).toMatch(/Registration must open/i);
  });

  it("detects valid auto schedule", () => {
    expect(hasValidAutoSchedule(base)).toBe(true);
    expect(hasValidAutoSchedule({ ...base, endsAt: null })).toBe(false);
  });

  it("computes status from timeline", () => {
    expect(computeAutoStatus(base, new Date("2026-06-01T11:00:00Z"))).toBe("REGISTRATION_OPEN");
    expect(computeAutoStatus(base, new Date("2026-06-10T10:00:00Z"))).toBe("IN_PROGRESS");
    expect(computeAutoStatus(base, new Date("2026-06-10T19:00:00Z"))).toBe("COMPLETED");
  });

  it("isTournamentRegistrationLive respects window", () => {
    expect(isTournamentRegistrationLive(base, new Date("2026-06-05T12:00:00Z"))).toBe(true);
    expect(isTournamentRegistrationLive(base, new Date("2026-06-10T10:00:00Z"))).toBe(false);
    expect(
      isTournamentRegistrationLive(
        { ...base, autoManageStatus: false, status: "REGISTRATION_OPEN" },
        new Date("2026-06-10T19:00:00Z"),
      ),
    ).toBe(true);
  });
});
