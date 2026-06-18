import Image from "next/image";
import Link from "next/link";
import BrandIcon from "./ui/BrandIcon";
import { brand, socials } from "@/lib/data";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--color-brand)]/55 to-transparent" />

      <div className="w-full px-6 pb-7 pt-9 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-10">
          {/* LEFT — full address */}
          <div className="min-w-0 max-w-md">
            <div className="flex items-center gap-3">
              <Image
                src="/ntg-logo.png"
                alt={brand.name}
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl object-cover drop-shadow-[0_0_10px_rgba(94,234,212,0.45)]"
              />
              <div className="leading-tight">
                <p className="font-display text-sm font-semibold tracking-[0.18em] text-white/95">
                  NTG <span className="text-[var(--color-brand)]">LOUNGE</span>
                </p>
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
                  {brand.meaning}
                </p>
              </div>
            </div>

            <address className="mt-4 not-italic text-[13px] leading-relaxed text-white/65">
              Lotus Paradise Elite, 302
              <br />
              Opp. AJ Grand Hotel, near Bunts Hostel Road
              <br />
              Boloor, Kodailbail, Mangaluru, Karnataka 575003
            </address>
          </div>

          {/* RIGHT — timings + socials */}
          <div className="flex flex-col items-start gap-4 md:items-end md:text-right">
            <div className="leading-tight">
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">
                Hours
              </p>
              <p className="mt-1.5 font-display text-base font-semibold text-white">
                {brand.hours}
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.22em] text-white/45">
                Open · Every Day
              </p>
            </div>

            <div className="flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  title={s.name}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition-all hover:border-[var(--color-brand)]/55 hover:text-[var(--color-brand)]"
                >
                  <BrandIcon path={s.path} title={s.name} className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 h-px w-full bg-gradient-to-r from-[var(--color-brand)]/20 via-[var(--color-iris)]/30 to-[var(--color-brand)]/20" />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-[10px] uppercase tracking-[0.22em] text-white/40">
          <p>
            © {year} {brand.name}
            <span className="mx-2 text-white/25">·</span>
            <Link href="/privacy" className="text-white/45 transition-colors hover:text-white/70">
              Privacy
            </Link>
          </p>
          <p>
            Crafted in <span className="text-white/80">Mangaluru</span>
            <span className="mx-2 text-white/25">·</span>
            Built for <span className="text-[var(--color-brand)]">Players</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
