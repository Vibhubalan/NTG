import type { PublicProfile } from "@core/contracts";
import type { CreateGameIdentityInput, UpdateProfileInput } from "../domain/types";
import { ProfileRepository } from "../infrastructure/profile.repository";
import { prisma } from "@core/database/client";
import { logUserActivity } from "@/lib/user-audit";

const profileRepo = new ProfileRepository();

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  return profileRepo.findPublicByUserId(userId);
}

export async function updatePlayerProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  const result = await profileRepo.updateProfile(userId, input);

  if (user && result) {
    await logUserActivity({
      userId,
      email: user.email,
      name: user.name,
      action: "PROFILE_UPDATE",
      details: "Updated player profile details.",
    });
  }

  return result;
}

export async function linkGameIdentity(
  userId: string,
  input: CreateGameIdentityInput,
): Promise<PublicProfile | null> {
  return profileRepo.linkGameIdentity(userId, input);
}
