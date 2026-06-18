import Link from "next/link";
import { getSession } from "@core/auth/session";

export const metadata = { title: "Admin access required" };

export default async function AdminAccessDeniedPage() {
  const session = await getSession();
  const signedInEmail = session?.user?.email ?? null;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-16 text-center">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-400">
        Access denied
      </div>
      <h1 className="font-display text-2xl font-bold text-white">Admin access required</h1>
      <p className="text-sm leading-relaxed text-white/45">
        {signedInEmail ? (
          <>
            You are signed in as <span className="text-white/70">{signedInEmail}</span>, but that
            account is not an admin. Use an email listed in <code className="text-white/60">ADMIN_EMAILS</code>{" "}
            or ask an existing admin to promote your role in Admin → Members.
          </>
        ) : (
          <>Sign in with an admin email, then return to the control center.</>
        )}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          href="/login?callbackUrl=/admin"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08]"
        >
          Sign in
        </Link>
        <Link
          href="/esports"
          className="rounded-xl px-4 py-2 text-sm font-medium text-amber-400/90 transition hover:text-amber-300"
        >
          Back to Esports
        </Link>
      </div>
    </div>
  );
}
