type Props = {
  code: string;
  hint?: string;
};

/** Shown only when the API returns a devOtp (development builds). */
export default function DevOtpBanner({ code, hint }: Props) {
  return (
    <div
      className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-amber-300/90">
        Dev OTP — email not sent locally
      </p>
      <p className="mt-1 font-mono text-3xl font-bold tracking-[0.35em] text-amber-100">
        {code}
      </p>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-amber-200/75">{hint}</p>
      ) : null}
    </div>
  );
}
