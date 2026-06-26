import { prisma } from "@core/database/client";

export type UserActivityParams = {
  userId?: string | null;
  email?: string | null;
  name?: string | null;
  action: "SIGNUP" | "LEAVE" | "PROFILE_UPDATE" | "RIOT_LINK" | "RIOT_UNLINK" | "STEAM_LINK" | "STEAM_UNLINK" | "TOURNAMENT_REGISTER" | "TOURNAMENT_UNREGISTER";
  target?: string | null;
  details?: string | null;
  metadata?: Record<string, any> | null;
};

export async function logUserActivity(params: UserActivityParams): Promise<void> {
  try {
    await prisma.userActivityLog.create({
      data: {
        userId: params.userId ?? null,
        email: params.email ?? null,
        name: params.name ?? null,
        action: params.action,
        target: params.target ?? null,
        details: params.details ?? null,
        metadata: params.metadata ? (params.metadata as any) : undefined,
      },
    });
  } catch (err) {
    console.error("[user-audit]", params.action, err);
  }
}
