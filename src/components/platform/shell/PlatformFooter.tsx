import Link from "next/link";

export default function PlatformFooter() {
  return (
    <footer className="mt-20 border-t border-white/[0.06] pt-8">
      <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/35">
          NTG competitive · Mangaluru
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] uppercase tracking-[0.18em]">
          <Link href="/" className="text-white/45 transition-colors hover:text-[var(--color-brand)]">
            Back to lounge
          </Link>
          <Link href="/esports/tournaments" className="text-white/45 transition-colors hover:text-white">
            Cups
          </Link>
          <Link href="/esports/leaderboard" className="text-white/45 transition-colors hover:text-white">
            Rankings
          </Link>
          <Link href="/gallery" className="text-white/45 transition-colors hover:text-white">
            Moments
          </Link>
          <Link href="/privacy" className="text-white/45 transition-colors hover:text-white">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
