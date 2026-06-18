"use client";

import DevOtpBanner from "./DevOtpBanner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

type Step = 1 | 2;

export default function SignupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [olympusId, setOlympusId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    const parsedStep = stepParam === "2" ? 2 : null;

    (async () => {
      try {
        const res = await fetch("/api/auth/register/status");
        const data = await res.json();
        if (data.pendingVerification) {
          setPendingVerification(true);
          if (data.email) setEmail(data.email);
          if (data.displayName) setDisplayName(data.displayName);
          if (parsedStep === 2) setStep(2);
        } else if (parsedStep) {
          setStep(parsedStep);
        }

        const storedOtp = sessionStorage.getItem("ntg_dev_otp");
        if (storedOtp) {
          setDevOtp(storedOtp);
          sessionStorage.removeItem("ntg_dev_otp");
          if (parsedStep === 2 || data.pendingVerification) setStep(2);
        }
      } catch {
        if (parsedStep) setStep(parsedStep);
      } finally {
        setRestoring(false);
      }
    })();
  }, [searchParams]);

  const progress = step === 1 ? 50 : 100;

  const emptyOtp = () => ["", "", "", "", "", ""] as string[];

  const focusOtp = useCallback((index: number) => {
    otpRefs.current[index]?.focus();
    otpRefs.current[index]?.select();
  }, []);

  const applyOtpDigits = useCallback(
    (digits: string, startIndex = 0) => {
      const clean = digits.replace(/\D/g, "").slice(0, 6);
      if (!clean) return;
      setError("");
      setOtp((prev) => {
        const next = [...prev];
        for (let i = 0; i < clean.length && startIndex + i < 6; i += 1) {
          next[startIndex + i] = clean[i]!;
        }
        return next;
      });
      const focusAt = Math.min(startIndex + clean.length, 5);
      requestAnimationFrame(() => focusOtp(focusAt));
    },
    [focusOtp],
  );

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      const digits = value.replace(/\D/g, "");
      if (digits.length > 1) {
        applyOtpDigits(digits, 0);
        return;
      }
      const digit = digits.slice(-1);
      setError("");
      setOtp((prev) => {
        const next = [...prev];
        next[index] = digit;
        return next;
      });
      if (digit && index < 5) {
        requestAnimationFrame(() => focusOtp(index + 1));
      }
    },
    [applyOtpDigits, focusOtp],
  );

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setError("");
        setOtp(emptyOtp());
        requestAnimationFrame(() => focusOtp(0));
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        setError("");
        setOtp((prev) => {
          const next = [...prev];
          if (prev[index]) {
            next[index] = "";
            return next;
          }
          if (index > 0) {
            next[index - 1] = "";
            requestAnimationFrame(() => focusOtp(index - 1));
          }
          return next;
        });
        return;
      }

      if (e.key === "Delete") {
        e.preventDefault();
        setError("");
        setOtp((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
        return;
      }

      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        focusOtp(index - 1);
        return;
      }

      if (e.key === "ArrowRight" && index < 5) {
        e.preventDefault();
        focusOtp(index + 1);
      }
    },
    [focusOtp],
  );

  const handleOtpPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text");
      if (!/\d/.test(text)) return;
      e.preventDefault();
      applyOtpDigits(text, 0);
    },
    [applyOtpDigits],
  );

  function goToVerification() {
    setError("");
    setDevOtp(null);
    setDevOtpHint(null);
    setOtp(["", "", "", "", "", ""]);
    setStep(2);
    router.replace("/signup?step=2");
  }

  function goBackToStep1() {
    setError("");
    setDevOtp(null);
    setDevOtpHint(null);
    setOtp(["", "", "", "", "", ""]);
    setStep(1);
    router.replace("/signup");
  }

  async function startOver(withCredentials = false) {
    setError("");
    setLoading(true);
    try {
      await fetch("/api/auth/register/abandon", {
        method: "POST",
        headers: withCredentials ? { "Content-Type": "application/json" } : undefined,
        body: withCredentials
          ? JSON.stringify({ email, password })
          : undefined,
      });
    } catch {
      /* still reset locally */
    }
    setPendingVerification(false);
    setDisplayName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setDateOfBirth("");
    setOlympusId("");
    setDevOtp(null);
    setDevOtpHint(null);
    setOtp(["", "", "", "", "", ""]);
    setStep(1);
    router.replace("/signup");
    setLoading(false);
  }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register/step-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          phone,
          password,
          dateOfBirth,
          olympusId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed.");
        return;
      }
      setPendingVerification(true);
      if (data.devOtp) setDevOtp(data.devOtp);
      if (data.devOtpHint) setDevOtpHint(data.devOtpHint);
      setStep(2);
      router.replace("/signup?step=2");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const code = otp.join("");
    try {
      const res = await fetch("/api/auth/register/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        setOtp(emptyOtp());
        requestAnimationFrame(() => focusOtp(0));
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created. Please sign in.");
        router.push("/login");
        return;
      }

      router.push("/profile");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register/send-otp", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not resend.");
        return;
      }
      if (data.devOtp) setDevOtp(data.devOtp);
      if (data.devOtpHint) setDevOtpHint(data.devOtpHint);
      setError("");
    } catch {
      setError("Could not resend code.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none";

  return (
    <div className="shine-border w-full rounded-[1.5rem]">
      <div className="shine-border-inner glass-strong rounded-[1.5rem] p-7 sm:p-8">
        {restoring ? (
          <p className="py-8 text-center text-sm text-white/50">Loading…</p>
        ) : (
          <>
            {step === 2 && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={goBackToStep1}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium normal-case tracking-normal text-white/70 transition hover:border-[var(--color-brand)]/30 hover:text-white"
                >
                  ← Back
                </button>
              </div>
            )}

            {step === 1 && pendingVerification ? (
              <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                <p>
                  Verification pending for{" "}
                  <span className="font-medium text-white">{email || "your email"}</span>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goToVerification}
                    className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/30"
                  >
                    Continue verification
                  </button>
                  <button
                    type="button"
                    onClick={() => startOver()}
                    disabled={loading}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white/90"
                  >
                    Start over
                  </button>
                </div>
              </div>
            ) : null}

            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-4">
                <p className="text-sm text-white/50">Create your player account.</p>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={32}
                  pattern="[A-Za-z0-9_-]+"
                  placeholder="Username"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-white/35">
                  Unique username: letters, numbers, underscores, and hyphens. Teammates add you by this name in FIFA cups.
                </p>
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="tel"
                  required
                  placeholder="Phone (+91)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={inputClass}
                  aria-label="Date of birth"
                />
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Olympus ID"
                    value={olympusId}
                    onChange={(e) => setOlympusId(e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-white/35">
                    Must be unique. One Olympus ID per NTG account.
                  </p>
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Password (min 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                <button
                  type="submit"
                  disabled={loading}
                  className="cta w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.18em] disabled:opacity-50"
                >
                  {loading ? "Please wait…" : "Continue"}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleStep2} className="space-y-4">
                <p className="text-sm text-white/50">Enter the 6-digit code sent to {email}.</p>
                {devOtp ? (
                  <DevOtpBanner
                    code={devOtp}
                    hint={
                      devOtpHint ??
                      "Email could not be sent. Use the code above to continue testing."
                    }
                  />
                ) : null}
                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      maxLength={6}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label={`Digit ${i + 1} of 6`}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] text-center text-lg font-semibold text-white focus:border-[var(--color-brand)]/45 focus:outline-none"
                    />
                  ))}
                </div>
                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                <button
                  type="submit"
                  disabled={loading || otp.join("").length < 6}
                  className="cta w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.18em] disabled:opacity-50"
                >
                  {loading ? "Finishing…" : "Verify & sign in"}
                </button>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={loading}
                    className="w-full text-center text-xs text-white/40 hover:text-white/70"
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    onClick={() => startOver()}
                    disabled={loading}
                    className="w-full text-center text-xs text-white/35 hover:text-white/60"
                  >
                    Wrong email? Start over
                  </button>
                </div>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-white/40">
              Already have an account?{" "}
              <Link href="/login" className="text-[var(--color-brand)] hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
