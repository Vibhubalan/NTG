import { whatsappInquiryUrl } from "@/lib/env";

export default function Hero() {
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
        className="text-outline pointer-events-none absolute left-1/2 top-[45%] sm:top-[50%] z-0 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[32vw] font-black leading-none tracking-[-0.06em] sm:text-[26vw] md:text-[22vw]"
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
          <p className="max-w-xl text-balance text-base leading-relaxed text-white/55 sm:text-lg translate-x-2.5">
            Mangaluru&apos;s premier esports lounge. Premium hardware, electric
            atmosphere, engineered for the players who set the standard.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href={whatsappInquiryUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="cta group relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] transition-all hover:scale-[1.03] hover:brightness-110"
            >
              Inquire Now
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
            <a
              href="#games"
              className="glass rounded-full px-7 py-3.5 text-sm font-medium uppercase tracking-[0.18em] text-white/85 transition-colors hover:text-white"
            >
              Explore Games
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
