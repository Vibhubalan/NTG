import SignupWizard from "@/components/auth/SignupWizard";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = {
  title: "Join",
};

export default function SignupPage() {
  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-4 text-center">
        <Link href="/" aria-label="Back to NTG Lounge">
          <Image
            src="/ntg-logo.png"
            alt="NTG Lounge"
            width={56}
            height={56}
            priority
            className="h-14 w-14 rounded-2xl object-cover shadow-[0_0_30px_rgba(94,234,212,0.3)]"
          />
        </Link>
        <div>
          <p className="font-display text-2xl font-bold tracking-tight text-white">
            Join the squad
          </p>
          <p className="mt-1 text-sm text-white/45">
            Create your NTG Lounge player profile
          </p>
        </div>
      </div>

      <Suspense>
        <SignupWizard />
      </Suspense>

      <p className="mt-8 text-center text-xs text-white/30">
        <Link href="/" className="hover:text-white/60 transition-colors">
          ← Back to NTG Lounge
        </Link>
      </p>
    </div>
  );
}
