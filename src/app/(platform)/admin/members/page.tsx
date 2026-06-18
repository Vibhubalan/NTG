import AdminMembersPanel from "@/components/admin/AdminMembersPanel";
import { listMembersAdmin } from "@auth-membership/application/admin-member.service";
import { serverEnv } from "@core/config/env.server";

export const metadata = { title: "Admin Members" };

export default async function AdminMembersPage() {
  const { users } = serverEnv.databaseUrl
    ? await listMembersAdmin({ limit: 200 })
    : { users: [] };

  return <AdminMembersPanel initialMembers={users} />;
}
