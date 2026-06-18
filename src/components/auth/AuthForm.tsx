"use client";

import DevOtpBanner from "./DevOtpBanner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

type Props = {
  mode: "login";
};

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/profile";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resumeStep, setResumeStep] = useState<2 | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDevOtp(null);
    setResumeStep(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        const check = await fetch("/api/auth/login-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const checkData = await check.json();
        if (checkData.blocked && checkData.resumeStep) {
          setLoading(false);
          setError(
            checkData.reason ??
              "Finish email verification before signing in.",
          );
          if (checkData.devOtp) {
            setDevOtp(checkData.devOtp);
            setResumeStep(checkData.resumeStep);
            return;
          }
          router.push(`/signup?step=${checkData.resumeStep}`);
          return;
        }
        if (checkData.blocked && checkData.reason) {
          setError(checkData.reason);
        } else {
          setError("Invalid email or password.");
        }
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="shine-border w-full rounded-[1.5rem]">
      <div className="shine-border-inner glass-strong rounded-[1.5rem] p-7 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--color-brand)]/45"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
              Password
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--color-brand)]/45"
              placeholder="Min. 8 characters"
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          {devOtp ? (
            <DevOtpBanner
              code={devOtp}
              hint={
                resumeStep === 2
                  ? "Use this code on the signup page to verify your email."
                  : "Continue signup to finish your account."
              }
            />
          ) : null}

          {devOtp && resumeStep ? (
            <Link
              href={`/signup?step=${resumeStep}`}
              onClick={() => {
                if (devOtp) sessionStorage.setItem("ntg_dev_otp", devOtp);
              }}
              className="cta block w-full rounded-full py-3.5 text-center text-sm font-semibold uppercase tracking-[0.18em]"
            >
              Continue signup
            </Link>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="cta w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.18em] transition-all hover:scale-[1.02] disabled:opacity-60"
          >
            {loading ? "Please wait…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          New here?{" "}
          <Link href="/signup" className="text-[var(--color-brand)] hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
