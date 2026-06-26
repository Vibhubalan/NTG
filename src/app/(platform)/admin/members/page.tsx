import AdminMembersPanel from "@/components/admin/AdminMembersPanel";
import { listMembersAdmin } from "@auth-membership/application/admin-member.service";
import { serverEnv } from "@core/config/env.server";
import { getSession } from "@core/auth/session";
import { isSuperAdminEmail } from "@/lib/superadmin";

export const metadata = { title: "Admin Members" };

export default async function AdminMembersPage() {
  const session = await getSession();
  const isSuperAdmin = isSuperAdminEmail(session?.user?.email);

  const { users } = serverEnv.databaseUrl
    ? await listMembersAdmin({ limit: 200 })
    : { users: [] };

  return <AdminMembersPanel initialMembers={users} isSuperAdmin={isSuperAdmin} />;
}
