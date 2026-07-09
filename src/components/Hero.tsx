import Link from "next/link";
import { getHeroCupStatus } from "@tournaments-leagues/index";
import HeroCupStatusBanner from "@/components/HeroCupStatusBanner";

const heroCtaBase =
  "inline-flex h-10 w-full cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all hover:scale-[1.03] active:scale-[0.98] sm:h-12 sm:gap-2 sm:px-5 sm:text-sm sm:tracking-[0.18em]";

export default async function Hero() {
  const heroCup = await getHeroCupStatus();
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden"
    >
      {/* Static aurora-style gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 22% 28%, rgba(124,58,237,0.45), transparent 60%), radial-gradient(55% 45% at 78% 72%, rgba(34,211,238,0.32), transparent 60%), radial-gradient(40% 35% at 50% 100%, rgba(168,85,247,0.28), transparent 65%)",
        }}
      />

      {/* Grid + bottom vignette */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[var(--color-ink)] to-transparent" />
      </div>

      {/* Watermark */}
      <span
        aria-hidden
        className="text-outline pointer-events-none absolute left-1/2 top-[42.7%] sm:top-[48.5%] z-0 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[32vw] font-black leading-none tracking-[-0.06em] sm:text-[26vw] md:text-[24vw]"
      >
        NTG
      </span>

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <h1 className="font-display font-semibold uppercase text-white mt-30">
          <span className="block text-4xl leading-[0.96] tracking-[-0.025em] sm:text-6xl md:text-7xl lg:text-[6rem]">
            Namma Tulunad
          </span>
          <span className="mt-2 block text-4xl leading-[0.96] tracking-[-0.025em] sm:text-6xl md:text-7xl lg:text-[6rem]">
            <span className="text-gradient-brand">Gaming</span>
          </span>
        </h1>

        <div className="relative top-10 flex flex-col items-center">
          <p className="max-w-xl text-balance text-base leading-relaxed text-white/55 sm:text-lg">
            Mangaluru&apos;s premier esports lounge. Premium hardware, electric
            atmosphere, engineered for the players who set the standard.
          </p>

          <div className="mt-10 grid w-full max-w-[19rem] grid-cols-2 gap-2 sm:max-w-md sm:gap-3">
            <Link
              href="/listings"
              className={`cta group relative ${heroCtaBase} hover:brightness-110`}
            >
              <span>Opportunities</span>
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/esports/tournaments"
              className={`glass group ${heroCtaBase} border border-white/15 text-white/90 hover:border-cyan-400/35 hover:bg-white/[0.08] hover:text-white hover:shadow-[0_0_32px_-10px_rgba(34,211,238,0.4)]`}
            >
              <span>Tournaments</span>
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:text-white sm:h-4 sm:w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {heroCup ? (
            <div className="mt-6 animate-in fade-in slide-in-from-top-1 duration-300">
              <HeroCupStatusBanner cup={heroCup} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
