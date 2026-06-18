import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { requireAdmin } from "@core/auth/require-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:gap-12">
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
