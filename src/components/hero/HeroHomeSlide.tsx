"use client";

import HeroCupStatusBanner, { type HeroCupStatusClient } from "@/components/HeroCupStatusBanner";
import SplitText from "@/components/SplitText";

type Props = {
  cup: HeroCupStatusClient | null;
  auctionHref: string | null;
};

export default function HeroHomeSlide({ cup, auctionHref }: Props) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <span
        aria-hidden
        className="text-outline pointer-events-none absolute left-1/2 top-[42.7%] z-0 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[25.6vw] font-black leading-none tracking-[-0.06em] sm:top-[48.5%] sm:text-[20.8vw] md:text-[19.2vw]"
      >
        NTG
      </span>

      {cup ? (
        <div
          className="absolute inset-x-0 z-10 -translate-y-full flex flex-col items-center px-6 text-center"
          style={{ top: "var(--hero-content-bottom-above)" }}
        >
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
            <HeroCupStatusBanner cup={cup} auctionHref={auctionHref} />
          </div>
        </div>
      ) : null}

      <div className="absolute inset-x-0 top-[42.7%] sm:top-[48.5%] z-10 -translate-y-1/2 flex flex-col items-center px-6 text-center">
        <h1 className="font-display font-semibold uppercase text-white">
          <span className="block leading-[0.96] tracking-[-0.025em]" style={{ fontSize: "var(--text-hero)" }}>
            <SplitText text="Namma Tulunad" delay={0} stagger={25} duration={680} />
          </span>
          <span className="mt-2 block leading-[0.96] tracking-[-0.025em]" style={{ fontSize: "var(--text-hero)" }}>
            <SplitText text="Gaming" delay={380} stagger={35} duration={680} charClassName="text-gradient-brand" />
          </span>
        </h1>
      </div>

      <div
        className="absolute inset-x-0 z-10 flex flex-col items-center gap-3 sm:gap-8 px-6 text-center"
        style={{ top: "var(--hero-content-top)" }}
      >
        <p
          className="leading-relaxed text-white/55"
          style={{
            fontSize: "clamp(0.68rem, 2.6vw, 1.3rem)",
            maxWidth: "clamp(14.4rem, 64vw, 54.4rem)",
          }}
        >
          Mangaluru&apos;s premier esports lounge — premium hardware, electric
          <span className="hidden sm:inline">
            <br />
          </span>
          <span className="sm:hidden"> </span>
          atmosphere, engineered for the players who set the standard.
        </p>
      </div>
    </div>
  );
}
