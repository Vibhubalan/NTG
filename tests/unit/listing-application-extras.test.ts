import { describe, expect, it } from "vitest";
import { isMissingListingApplicationExtrasColumn } from "@/modules/roster-listings/domain/listing-application-extras";

describe("listing application extra columns", () => {
  it("treats Prisma P2022 as a missing-column error", () => {
    expect(isMissingListingApplicationExtrasColumn({ code: "P2022", message: "Column missing" })).toBe(
      true,
    );
  });

  it("detects postgres column-missing messages for extras", () => {
    expect(
      isMissingListingApplicationExtrasColumn({
        message: "column ListingApplication.pastExperience does not exist",
      }),
    ).toBe(true);
  });

  it("does not treat unrelated errors as missing extras", () => {
    expect(isMissingListingApplicationExtrasColumn({ code: "P2002", message: "Unique constraint" })).toBe(
      false,
    );
    expect(isMissingListingApplicationExtrasColumn(new Error("timeout"))).toBe(false);
  });
});
