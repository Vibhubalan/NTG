import { prisma } from "@core/database/client";
import { UserRole } from "@prisma/client";
import { logUserActivity } from "@/lib/user-audit";

export async function deleteUserAccount(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true, name: true },
  });

  if (!user) {
    return { ok: false, error: "Account not found." };
  }

  if (user.role === UserRole.ADMIN) {
    return { ok: false, error: "Admin accounts must be removed by support." };
  }

  await logUserActivity({
    userId,
    email: user.email,
    name: user.name,
    action: "LEAVE",
    details: "Deleted their own account.",
  });

  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
