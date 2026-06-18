import { describe, expect, it } from "vitest";
import {
  ACCOUNT_ID_PATTERN,
  isValidAccountIdFormat,
  normalizeAccountId,
} from "@auth-membership/domain/account-id";

describe("account-id", () => {
  it("normalizes to uppercase trimmed NTG####", () => {
    expect(normalizeAccountId(" ntg0042 ")).toBe("NTG0042");
  });

  it("validates NTG#### pattern", () => {
    expect(ACCOUNT_ID_PATTERN.test("NTG0001")).toBe(true);
    expect(isValidAccountIdFormat("ntg9999")).toBe(true);
    expect(isValidAccountIdFormat("NTG999")).toBe(false);
    expect(isValidAccountIdFormat("NTG10000")).toBe(false);
    expect(isValidAccountIdFormat("ABC1234")).toBe(false);
  });
});
