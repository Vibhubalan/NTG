import { prisma } from "@core/database/client";

export const ACCOUNT_ID_PATTERN = /^NTG[0-9]{4}$/;

export function normalizeAccountId(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidAccountIdFormat(id: string): boolean {
  return ACCOUNT_ID_PATTERN.test(normalizeAccountId(id));
}

function randomAccountId(): string {
  const num = Math.floor(Math.random() * 10_000);
  return `NTG${String(num).padStart(4, "0")}`;
}

/** Assign a unique NTG#### id to a user (retries on collision). */
export async function assignUniqueAccountId(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = randomAccountId();
    const taken = await prisma.user.findUnique({
      where: { accountId: candidate },
      select: { id: true },
    });
    if (taken) continue;

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { accountId: candidate },
      });
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error("Could not assign a unique account ID.");
}

/** Generate id for use inside create (checks uniqueness before return). */
export async function generateUniqueAccountId(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = randomAccountId();
    const taken = await prisma.user.findUnique({
      where: { accountId: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw new Error("Could not generate a unique account ID.");
}
