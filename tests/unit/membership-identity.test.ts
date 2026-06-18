import { describe, expect, it } from "vitest";
import {
  normalizeIdentityKey,
  olympusIdKeyFromValue,
  usernameKeyFromDisplayName,
} from "@auth-membership/domain/username";

describe("membership identity keys", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeIdentityKey("  PlayerOne  ")).toBe("playerone");
    expect(usernameKeyFromDisplayName("Viper_Main")).toBe("viper_main");
    expect(olympusIdKeyFromValue(" OLY-123 ")).toBe("oly-123");
  });

  it("treats equivalent olympus ids as the same key", () => {
    expect(olympusIdKeyFromValue("OLY123")).toBe(olympusIdKeyFromValue("oly123"));
  });
});
