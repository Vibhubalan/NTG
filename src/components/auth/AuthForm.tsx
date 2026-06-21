"use client";

import DevOtpBanner from "./DevOtpBanner";
import PasswordField from "./PasswordField";
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
  const justRegistered = searchParams.get("registered") === "1";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resumeStep, setResumeStep] = useState<2 | null>(null);

  // Forgot password views: "login" | "forgot-email" | "forgot-reset"
  const [view, setView] = useState<"login" | "forgot-email" | "forgot-reset">("login");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotDevOtp, setForgotDevOtp] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
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
              "Finish email verification before logging in.",
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

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setForgotDevOtp(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send verification code.");
        setLoading(false);
        return;
      }
      setSuccessMessage("Verification code has been sent to your email.");
      if (data.devOtp) {
        setForgotDevOtp(data.devOtp);
      }
      setView("forgot-reset");
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          email,
          code: resetCode,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not reset password.");
        setLoading(false);
        return;
      }
      setSuccessMessage("Password successfully reset! You can now log in.");
      setView("login");
      setNewPassword("");
      setResetCode("");
      setForgotDevOtp(null);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="shine-border w-full rounded-[1.5rem]">
      <div className="shine-border-inner glass-strong rounded-[1.5rem] p-7 sm:p-8">
        
        {/* LOGIN VIEW */}
        {view === "login" && (
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
              <PasswordField
                required
                minLength={8}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--color-brand)]/45"
                placeholder="Min. 8 characters"
              />
              
              <div className="flex items-center justify-between mt-2 pl-1">
                <span className="text-white/40 text-xs"></span>
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot-email");
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="text-xs font-semibold text-[var(--color-brand)] hover:underline cursor-pointer transition-colors hover:text-white/80"
                >
                  Forgot password?
                </button>
              </div>
            </label>

            {justRegistered && !successMessage && (
              <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                Account created. Log in with your email and password.
              </p>
            )}

            {successMessage && (
              <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {successMessage}
              </p>
            )}

            {error && (
              <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            {devOtp && (
              <DevOtpBanner
                code={devOtp}
                hint={
                  resumeStep === 2
                    ? "Use this code on the signup page to verify your email."
                    : "Continue signup to finish your account."
                }
              />
            )}

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
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="cta w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.18em] transition-all hover:scale-[1.02] disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Please wait…" : "Login"}
              </button>
            )}
          </form>
        )}

        {/* FORGOT PASSWORD: REQUEST EMAIL VIEW */}
        {view === "forgot-email" && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <h3 className="text-lg font-bold text-white font-display">Reset Password</h3>
            <p className="text-xs text-white/50">Enter your email and we will send you a verification code.</p>
            
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
                Email Address
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--color-brand)]/45"
                placeholder="you@example.com"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="cta w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.18em] transition-all hover:scale-[1.02] disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Sending code…" : "Send Reset Code"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError("");
                  setSuccessMessage("");
                }}
                className="text-xs font-semibold text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD: ENTER CODE AND NEW PASSWORD VIEW */}
        {view === "forgot-reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <h3 className="text-lg font-bold text-white font-display">Create New Password</h3>
            {successMessage && (
              <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {successMessage}
              </p>
            )}

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
                Verification Code
              </span>
              <input
                type="text"
                required
                maxLength={6}
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit code"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--color-brand)]/45 font-mono text-center tracking-widest text-lg"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
                New Password
              </span>
              <PasswordField
                required
                minLength={8}
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min. 8 characters"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--color-brand)]/45"
              />
            </label>

            {forgotDevOtp && (
              <DevOtpBanner
                code={forgotDevOtp}
                hint="Use this code in the verification field above."
              />
            )}

            {error && (
              <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="cta w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.18em] transition-all hover:scale-[1.02] disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Resetting password…" : "Reset Password"}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleRequestReset}
                className="text-xs font-semibold text-[var(--color-brand)] hover:underline cursor-pointer transition-colors"
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError("");
                  setSuccessMessage("");
                }}
                className="text-xs font-semibold text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                ← Cancel
              </button>
            </div>
          </form>
        )}

        {view === "login" && (
          <p className="mt-6 text-center text-sm text-white/40">
            New here?{" "}
            <Link href="/signup" className="text-[var(--color-brand)] hover:underline">
              Create account
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
