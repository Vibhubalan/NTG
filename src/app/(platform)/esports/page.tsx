import Link from "next/link";
import EsportsRegistrationSlides from "@/components/platform/EsportsRegistrationSlides";
import { listActiveRegistrationBanners, listTournamentPreviews } from "@tournaments-leagues/index";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Esports",
};

export default async function EsportsHubPage() {
  const [tournaments, openRegistrations] = await Promise.all([
    listTournamentPreviews(),
    listActiveRegistrationBanners(),
  ]);

  const openCount = tournaments.filter(
    (t) =>
      t.status === "UPCOMING" ||
      t.status === "REGISTRATION_OPEN" ||
      t.status === "IN_PROGRESS",
  ).length;
  const completedCount = tournaments.filter((t) => t.status === "COMPLETED").length;
  const nextTourney =
    openRegistrations.length === 1
      ? openRegistrations[0].title
      : openRegistrations.length > 1
        ? `${openRegistrations.length} open`
        : tournaments.find(
            (t) =>
              t.status === "UPCOMING" ||
              t.status === "REGISTRATION_OPEN" ||
              t.status === "DRAFT",
          )?.name ?? "—";

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      <section className="relative mt-8 text-center sm:mt-12">
        <div className="mx-auto mb-8 inline-flex items-center gap-2.5 rounded-full border border-[var(--color-brand)]/20 bg-[var(--color-brand)]/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-brand)] backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-brand)]" />
          </span>
          NTG Competitive Season
        </div>
        <h1 className="font-display text-5xl font-black tracking-tight text-white drop-shadow-lg sm:text-7xl">
          PLAY. RANK. <span className="bg-gradient-to-r from-[var(--color-iris)] to-[var(--color-brand)] bg-clip-text text-transparent">WIN.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-white/50 sm:text-lg">
          The ultimate competitive hub for Mangaluru. Browse live cups, climb the town leaderboards, and build your legacy from the ground up.
        </p>
      </section>

      {openRegistrations.length > 0 ? (
        <EsportsRegistrationSlides banners={openRegistrations} />
      ) : null}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/esports/tournaments" prefetch={true} className="group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-[#0F0F0F] p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-iris)]/40 hover:bg-[#151515] hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] active:scale-[0.98]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-[var(--color-iris)]/10 blur-[50px] transition-all group-hover:bg-[var(--color-iris)]/20" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-iris)]/10 text-[var(--color-iris)] ring-1 ring-inset ring-[var(--color-iris)]/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="relative z-10 mt-auto pt-8">
            <h3 className="font-display text-2xl font-bold tracking-wide text-white">Cups Archive</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/50">{tournaments.length} tournaments. Browse past events, open cups, and detailed results.</p>
          </div>
        </Link>

        <Link href="/esports/leaderboard" prefetch={true} className="group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-[#0F0F0F] p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-brand)]/40 hover:bg-[#151515] hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] active:scale-[0.98]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-[var(--color-brand)]/10 blur-[50px] transition-all group-hover:bg-[var(--color-brand)]/20" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand)]/10 text-[var(--color-brand)] ring-1 ring-inset ring-[var(--color-brand)]/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v8l9-11h-7z" />
            </svg>
          </div>
          <div className="relative z-10 mt-auto pt-8">
            <h3 className="font-display text-2xl font-bold tracking-wide text-white">Valorant Rankings</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/50">Who runs Mangaluru? Live competitive RR from NTG players with linked Riot IDs.</p>
          </div>
        </Link>

        <Link href="/gallery" prefetch={true} className="group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.06] bg-[#0F0F0F] p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#F43F5E]/40 hover:bg-[#151515] hover:shadow-[0_0_30px_rgba(244,63,94,0.15)] active:scale-[0.98]">
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-[#F43F5E]/10 blur-[50px] transition-all group-hover:bg-[#F43F5E]/20" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F43F5E]/10 text-[#F43F5E] ring-1 ring-inset ring-[#F43F5E]/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="relative z-10 mt-auto pt-8">
            <h3 className="font-display text-2xl font-bold tracking-wide text-white">Moments</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/50">Highlights, finals nights, and the vibe from our live events.</p>
          </div>
        </Link>
      </div>

      <div className="mt-6 flex flex-col items-center justify-between gap-8 rounded-[2rem] border border-white/[0.04] bg-[#0A0A0A]/50 px-8 py-10 shadow-inner backdrop-blur-sm sm:flex-row sm:px-16">
        <div className="text-center sm:text-left">
          <p className="font-display text-4xl font-black tracking-tight text-white">{openCount}</p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--color-brand)]">Active Cups</p>
        </div>

        <div className="hidden h-12 w-px bg-white/10 sm:block" />

        <div className="text-center sm:text-left">
          <p className="font-display text-4xl font-black tracking-tight text-white">{completedCount}</p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">Completed</p>
        </div>

        <div className="hidden h-12 w-px bg-white/10 sm:block" />

        <div className="text-center sm:text-right">
          <p className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl max-w-[200px] truncate">
            {nextTourney}
          </p>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--color-iris)]">Next Tourney</p>
        </div>
      </div>
    </div>
  );
}
