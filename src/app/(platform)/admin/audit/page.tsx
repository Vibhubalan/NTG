import AdminAuditLogPanel from "@/components/admin/AdminAuditLogPanel";
import DailyRefreshRunsPanel from "@/components/admin/DailyRefreshRunsPanel";
import RankChangeAuditPanel from "@/components/admin/RankChangeAuditPanel";
import { getSession } from "@core/auth/session";
import { isSuperAdminEmail } from "@/lib/superadmin";

export const metadata = { title: "System Audit Logs | Admin" };

export default async function AdminAuditPage() {
  const session = await getSession();
  const isSuperAdmin = isSuperAdminEmail(session?.user?.email);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/[0.06] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-400">
          Superuser Access
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          System Audit
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-white/40">
          Track system changes, daily synchronizations, and player activities.
        </p>
      </div>

      {/* Stack of Logs */}
      <div className="space-y-8">
        <AdminAuditLogPanel />
        {isSuperAdmin && <DailyRefreshRunsPanel />}
        {isSuperAdmin && <RankChangeAuditPanel />}
      </div>
    </div>
  );
}
