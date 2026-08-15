"use client";

import BrandIcon from "@/components/ui/BrandIcon";
import type { HeroSocialLink } from "./hero-carousel-types";

type Props = {
  socials: HeroSocialLink[];
};

export default function HeroSocialsSlide({ socials }: Props) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-8 pb-12 pt-32 sm:px-16 sm:pt-36">
      <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/40">
        Socials
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.7rem,3.8vw,3rem)] font-semibold tracking-[-0.03em] text-white">
        Follow NTG
      </h2>

      <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-8 sm:mt-14 sm:gap-x-14">
        {socials.map((s) => (
          <li key={s.name}>
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              className="group flex flex-col items-center gap-3 text-white/55 transition-colors hover:text-white"
            >
              <BrandIcon path={s.path} title={s.name} className="h-6 w-6 sm:h-7 sm:w-7" />
              <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/35 transition-colors group-hover:text-white/70">
                {s.name}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
