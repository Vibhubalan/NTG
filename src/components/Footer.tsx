import Image from "next/image";
import BrandIcon from "./ui/BrandIcon";
import { brand, socials } from "@/lib/data";

const visitLinks = [
  { label: "Reserve", href: "#visit" },
  { label: brand.instagram, href: "https://instagram.com/ntg_lounge" },
  { label: brand.link, href: `https://${brand.link}` },
];

export default function Footer() {
  return (
    <footer className="relative">
      {/* Top accent line — full width, brand gradient */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--color-brand)]/50 to-transparent" />

      <div className="w-full px-8 pb-8 pt-10">
        <div className="flex flex-col items-start gap-6">
          {/* Logo and Name */}
          <div className="flex items-center gap-3">
            <Image
              src="/ntg-logo.png"
              alt={brand.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-cover drop-shadow-[0_0_12px_rgba(94,234,212,0.5)]"
            />
            <div className="leading-none">
              <p className="font-display text-base font-semibold tracking-[0.18em] text-white/90 mt-1">
                NTG <span className="text-[var(--color-brand)]">LOUNGE</span>
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="max-w-sm text-balance text-sm leading-relaxed text-white/50">
            Mangaluru&apos;s premier esports lounge. PC · PS5 · Screenings ·
            Birthdays · Tournaments.
          </p>

          {/* Socials */}
          <div className="flex items-center gap-2">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.name}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition-all hover:border-[var(--color-brand)]/50 hover:text-[var(--color-brand)]"
              >
                <BrandIcon path={s.path} title={s.name} className="h-4 w-4" />
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} {brand.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
