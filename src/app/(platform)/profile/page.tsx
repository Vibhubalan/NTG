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
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <PlatformHeader
        eyebrow="Player Profile"
        title="Account Settings"
        subtitle="Manage your NTG lounge identity, linked game profiles, and tournament settings."
      />
      <ProfileEditor />
    </div>
  );
}
