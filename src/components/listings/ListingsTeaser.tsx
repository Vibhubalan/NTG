import Link from "next/link";
import { listOpenListings } from "@roster-listings/index";

export default async function ListingsTeaser() {
  const listings = await listOpenListings();
  const preview = listings.slice(0, 3);

  if (preview.length === 0) return null;

  return (
    <section id="careers" className="relative mx-auto w-full max-w-6xl scroll-mt-28 px-5 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-0 top-1/4 h-[38vh] w-[38vh] rounded-full bg-[radial-gradient(circle,rgba(94,234,212,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute left-0 bottom-0 h-[32vh] w-[32vh] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.12),transparent_65%)] blur-3xl" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-14">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-[var(--color-brand)]/80">
            Work & compete
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
            Jobs and team tryouts at NTG
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/55">
            Open roles and roster applications. Apply with your NTG member profile in a few clicks.
          </p>
          <Link
            href="/careers"
            className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-[var(--color-brand)]"
          >
            View all listings
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="space-y-2.5">
          {preview.map((l) => (
            <Link
              key={l.id}
              href={`/careers/${l.slug}`}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 transition-all duration-300 hover:border-[var(--color-brand)]/25 hover:bg-white/[0.04]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white/85 group-hover:text-white transition-colors">
                  {l.title}
                </p>
                {l.gameLabel ? (
                  <p className="mt-0.5 text-[11px] text-white/35">{l.gameLabel}</p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full border border-[var(--color-brand)]/25 bg-[var(--color-brand)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-brand)]">
                {l.type === "JOB" ? "Job" : "Tryout"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
