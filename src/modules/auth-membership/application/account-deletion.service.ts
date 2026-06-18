import { prisma } from "@core/database/client";
import { UserRole } from "@prisma/client";

export async function deleteUserAccount(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return { ok: false, error: "Account not found." };
  }

  if (user.role === UserRole.ADMIN) {
    return { ok: false, error: "Admin accounts must be removed by support." };
  }

  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
