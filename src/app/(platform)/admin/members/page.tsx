import AdminMembersPanel from "@/components/admin/AdminMembersPanel";
import { listMembersAdmin } from "@auth-membership/application/admin-member.service";
import { serverEnv } from "@core/config/env.server";
import { getSession } from "@core/auth/session";
import { isSuperAdminEmail } from "@/lib/superadmin";

export const metadata = { title: "Admin Members" };

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const session = await getSession();
  const isSuperAdmin = isSuperAdminEmail(session?.user?.email);

  const { users, total } = serverEnv.databaseUrl
    ? await listMembersAdmin({ limit: 200 })
    : { users: [], total: 0 };

  return (
    <AdminMembersPanel
      initialMembers={users}
      memberTotal={total}
      isSuperAdmin={isSuperAdmin}
      clashRoyaleEnabled={serverEnv.clashRoyaleLeaderboardEnabled}
    />
  );
}
