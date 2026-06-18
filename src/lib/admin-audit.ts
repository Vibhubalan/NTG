import { prisma } from "@core/database/client";

export async function logAdminAction(
  adminId: string,
  action: string,
  target?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        target,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  } catch (err) {
    console.error("[admin-audit]", action, err);
  }
}
