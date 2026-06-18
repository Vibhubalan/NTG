import { describe, expect, it } from "vitest";
import {
  fifaRegisterSchema,
  normalizePhone,
  otpVerifySchema,
  signupStep1Schema,
} from "@auth-membership/domain/schemas";

describe("normalizePhone", () => {
  it("adds +91 for 10-digit Indian numbers", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
  });

  it("accepts +91 prefix", () => {
    expect(normalizePhone("+919876543210")).toBe("+919876543210");
  });

  it("throws for invalid numbers", () => {
    expect(() => normalizePhone("123")).toThrow(/Invalid phone/i);
  });
});

describe("otpVerifySchema", () => {
  it("requires 6 digits", () => {
    expect(otpVerifySchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ code: "12345" }).success).toBe(false);
  });
});

describe("signupStep1Schema", () => {
  it("accepts valid signup payload", () => {
    const result = signupStep1Schema.safeParse({
      displayName: "PlayerOne",
      email: "player@example.com",
      phone: "+919876543210",
      password: "password123",
      dateOfBirth: "2000-01-15",
      olympusId: "OLY123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects underage DOB", () => {
    const result = signupStep1Schema.safeParse({
      displayName: "Kid",
      email: "kid@example.com",
      phone: "+919876543210",
      password: "password123",
      dateOfBirth: "2020-01-15",
      olympusId: "OLY123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects usernames with spaces", () => {
    const result = signupStep1Schema.safeParse({
      displayName: "Player One",
      email: "player@example.com",
      phone: "+919876543210",
      password: "password123",
      dateOfBirth: "2000-01-15",
      olympusId: "OLY123",
    });
    expect(result.success).toBe(false);
  });
});

describe("fifaRegisterSchema", () => {
  it("accepts partner username", () => {
    const result = fifaRegisterSchema.safeParse({
      teamName: "Dream Team",
      partnerUsername: "Teammate_42",
      acceptedTerms: true,
    });
    expect(result.success).toBe(true);
  });
});
