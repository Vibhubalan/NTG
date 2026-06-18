import { getSession } from "@core/auth/session";
import { deleteUserAccount } from "@auth-membership/application/account-deletion.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await deleteUserAccount(session.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
