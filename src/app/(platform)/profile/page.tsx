import { getSession } from "@core/auth/session";
import ProfileEditor from "@/components/platform/ProfileEditor";
import PlatformHeader from "@/components/platform/shell/PlatformHeader";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@auth-membership/index";

async function handleSignOut() {
  "use server";
  if (signOut) {
    await signOut({ redirectTo: "/" });
  } else {
    redirect("/");
  }
}

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const displayName = session.user.name ?? "Your profile";

  return (
    <div className="mx-auto max-w-4xl">
      <PlatformHeader
        eyebrow="Player"
        title={displayName}
      />

      <div className="shine-border rounded-[1.5rem]">
        <div className="shine-border-inner rounded-[1.5rem] glass-strong p-7 sm:p-8">
          <ProfileEditor />

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-6">
            <Link
              href="/esports/tournaments"
              className="rounded-full border border-white/12 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/75 transition-colors hover:border-white/25 hover:text-white"
            >
              Browse cups
            </Link>
            <form action={handleSignOut} className="ml-auto">
              <button
                type="submit"
                className="rounded-full border border-red-500/25 bg-red-500/[0.08] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300/90 transition-colors hover:border-red-500/45 hover:bg-red-500/[0.14] hover:text-red-200"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
