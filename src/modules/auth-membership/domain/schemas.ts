import { z } from "zod";

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  throw new Error("Invalid phone number. Use a 10-digit Indian mobile number.");
}

export const usernameSchema = z
  .string()
  .trim()
  .min(2, "Username must be at least 2 characters.")
  .max(32, "Username must be at most 32 characters.")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only use letters, numbers, underscores, and hyphens.",
  );

export const signupStep1Schema = z.object({
  displayName: usernameSchema,
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(10).max(16),
  password: z.string().min(8).max(128),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD).")
    .refine((d) => {
      const birth = new Date(`${d}T00:00:00`);
      if (Number.isNaN(birth.getTime())) return false;
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
      return age >= 10 && age <= 100;
    }, "Age must be between 10 and 100."),
  olympusId: z.string().trim().min(1).max(64),
});

export const otpVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const riotLinkSchema = z.object({
  riotId: z
    .string()
    .trim()
    .regex(/^[^#]{3,16}#[a-zA-Z0-9]{3,5}$/i, "Use format Name#Tag (e.g. Player#NA1)."),
});

export const steamLinkSchema = z.object({
  profileUrl: z
    .string()
    .trim()
    .min(10)
    .refine(
      (v) => v.includes("steamcommunity.com"),
      "Use a Steam profile URL (steamcommunity.com/profiles/… or /id/…).",
    ),
});

export const selectGamesSchema = z
  .object({
    valorant: z.boolean().optional(),
    cs2: z.boolean().optional(),
  })
  .refine((v) => v.valorant || v.cs2, "Select at least one game.");

export const valorantRolesSchema = z.array(
  z.enum(["DUELIST", "INITIATOR", "CONTROLLER", "SENTINEL", "FLEX"]),
);

export const cs2PremierRankSchema = z.string().trim().min(1).max(16);

export const cs2FaceitRankSchema = z.string().trim().min(1).max(32);

const registrationTermsField = {
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the rules and policy." }),
  }),
};

export const fifaRegisterSchema = z.object({
  teamName: z.string().trim().min(2).max(48),
  partnerUsername: usernameSchema,
  ...registrationTermsField,
});

export const profileAccountPatchSchema = z.object({
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date (YYYY-MM-DD).")
    .optional(),
  olympusId: z.string().trim().min(1).max(64).optional(),
});

export const tournamentRegisterSchema = z.discriminatedUnion("participantRole", [
  z.object({
    participantRole: z.literal("CAPTAIN"),
    teamName: z.string().trim().min(2).max(48),
    logoUrl: z.string().trim().url(),
    valorantRoles: valorantRolesSchema.optional(),
    cs2PeakPremierRank: cs2PremierRankSchema.optional(),
    ...registrationTermsField,
  }),
  z.object({
    participantRole: z.literal("PLAYER"),
    valorantRoles: valorantRolesSchema.optional(),
    cs2PeakPremierRank: cs2PremierRankSchema.optional(),
    ...registrationTermsField,
  }),
]);

export type SignupStep1Input = z.infer<typeof signupStep1Schema>;
