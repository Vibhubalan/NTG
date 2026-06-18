import { describe, expect, it } from "vitest";
import { computeAgeFromDateOfBirth, formatDateOfBirthDisplay } from "@/lib/date-age";

describe("computeAgeFromDateOfBirth", () => {
  it("returns age on birthday", () => {
    const age = computeAgeFromDateOfBirth("2000-06-18", new Date("2020-06-18T12:00:00"));
    expect(age).toBe(20);
  });

  it("subtracts one year before birthday", () => {
    const age = computeAgeFromDateOfBirth("2000-12-01", new Date("2020-06-18T12:00:00"));
    expect(age).toBe(19);
  });

  it("returns null for invalid or missing input", () => {
    expect(computeAgeFromDateOfBirth(null)).toBeNull();
    expect(computeAgeFromDateOfBirth("not-a-date")).toBeNull();
  });
});

describe("formatDateOfBirthDisplay", () => {
  it("formats ISO date as DD-MM-YYYY", () => {
    expect(formatDateOfBirthDisplay("1998-03-15")).toBe("15-03-1998");
  });

  it("returns null when empty", () => {
    expect(formatDateOfBirthDisplay(undefined)).toBeNull();
  });
});
