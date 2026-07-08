import Link from "next/link";
import { getSession } from "@core/auth/session";
import { getPlayerGameProfile } from "@auth-membership/index";
import { listActiveRegistrationBanners, listTournamentPreviews, getValorantRankings } from "@tournaments-leagues/index";
import { prisma } from "@core/database/client";
import { rankIconUrl } from "@/lib/valorant-rank";
import { sortTournamentsByHostingOrder, sortTournamentsByHostingOrderNewestFirst } from "@/lib/tournament-display";
import EsportsRegistrationSlides from "@/components/platform/EsportsRegistrationSlides";
import TournamentVaultSection from "@/components/tournaments/TournamentVaultSection";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Esports",
};

export default async function EsportsHubPage() {
  const session = await getSession();
  const userId = session?.user?.id;

  const [tournaments, openRegistrations, leaderboardData, profile, userRegistrations] = await Promise.all([
    listTournamentPreviews(),
    listActiveRegistrationBanners(),
    getValorantRankings(3),
    userId ? getPlayerGameProfile(userId) : Promise.resolve(null),
    userId
      ? prisma.tournamentRegistration.findMany({
        where: { userId },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
            },
          },
        },
      })
      : Promise.resolve([]),
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

  const completedTournaments = tournaments.filter((t) => t.status === "COMPLETED");
  const latestCompleted = sortTournamentsByHostingOrder(completedTournaments)
    .filter((t) => t.championName)
    .at(-1);

  const scheduleTournaments = sortTournamentsByHostingOrderNewestFirst(
    tournaments.filter((t) => t.status !== "DRAFT" && t.status !== "CANCELLED"),
  );

  const activeUserRegistrations = userRegistrations.filter(
    (reg) => reg.tournament.status !== "COMPLETED" && reg.tournament.status !== "CANCELLED"
  );

  const first = leaderboardData.entries[0];
  const second = leaderboardData.entries[1];
  const third = leaderboardData.entries[2];

  return (
    <div className="relative flex flex-col gap-12 sm:gap-16">
      {/* Background Aurora Glows */}
      <div className="pointer-events-none absolute left-1/4 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-[var(--color-iris)]/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 top-60 -z-10 h-[450px] w-[450px] rounded-full bg-[var(--color-brand)]/5 blur-[120px]" />

      <section className="relative mt-8 text-center sm:mt-12">
        <div className="mx-auto mb-8 inline-flex items-center gap-2.5 rounded-full border border-[var(--color-brand)]/20 bg-[var(--color-brand)]/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-brand)] backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-brand)]" />
          </span>
          NTG Competitive Season
        </div>
        <h1 className="font-display text-5xl font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] sm:text-7xl">
          PLAY. RANK. <span className="bg-gradient-to-r from-[var(--color-iris)] to-[var(--color-brand)] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(124,58,237,0.35)]">WIN.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-white/50 sm:text-lg">
          The ultimate competitive hub for Mangaluru. Browse live cups, climb the town leaderboards, and build your legacy from the ground up.
        </p>
      </section>

      {openRegistrations.length > 0 ? (
        <EsportsRegistrationSlides banners={openRegistrations} />
      ) : null}



      {/* Personalized Player Dashboard / CTA */}
      {profile ? (
        <div className="rounded-[2rem] border border-white/[0.06] bg-[#0A0A0A]/40 p-6 backdrop-blur-md sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-iris)] to-[var(--color-brand)] text-xl font-black text-white shadow-lg">
                {profile.displayName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-brand)]">Logged In Player</p>
                <h2 className="font-display text-xl font-black tracking-tight text-white">{profile.displayName}</h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Riot Identity</p>
                <p className="mt-0.5 text-xs font-semibold text-white">
                  {profile.riotId ? profile.riotId : "Not Linked"}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Steam Identity</p>
                <p className="mt-0.5 text-xs font-semibold text-white">
                  {profile.steamPersonaName ? profile.steamPersonaName : "Not Linked"}
                </p>
              </div>
              {profile.riotId && (
                <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2">
                  {rankIconUrl(profile.valorantRankTierId) && (
                    <img src={rankIconUrl(profile.valorantRankTierId)!} alt="Rank" className="h-6 w-6 object-contain" />
                  )}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Valorant Rank</p>
                    <p className="mt-0.5 text-xs font-semibold text-white">
                      {profile.valorantRankTier ? profile.valorantRankTier : "Unranked"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-white/[0.06] pt-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3">Your Registrations</h3>
            {activeUserRegistrations.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {activeUserRegistrations.map((reg) => (
                  <div key={reg.id} className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-1.5 text-xs font-semibold text-emerald-300">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    {reg.tournament.name} ({reg.tournament.status.replace("_", " ")})
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30">You have no active tournament registrations. Head over to Cups Archive to register!</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/[0.06] bg-gradient-to-br from-[#121212]/90 to-[#080808]/90 p-6 backdrop-blur-md sm:p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[var(--color-iris)]/5 blur-[50px] group-hover:bg-[var(--color-iris)]/10 transition-colors" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-2xl font-black tracking-tight text-white">Join the NTG Arena</h2>
              <p className="mt-2 text-sm text-white/45 max-w-xl">
                Create an account, link your Riot & Steam IDs, track your rankings live on the town leaderboard, and join community cups.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link href="/login" className="rounded-full bg-white px-5 py-3 text-xs font-bold uppercase tracking-wider text-black transition-transform hover:scale-[1.03] active:scale-[0.98]">
                Sign In
              </Link>
              <Link href="/signup" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.98]">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      )}      {/* Valorant Top 3 Podium Widget */}
      <div className="rounded-[2rem] border border-[var(--color-iris)]/15 bg-gradient-to-br from-[#120F1F]/40 via-[#0A0A0A]/60 to-[#0A161A]/40 p-6 backdrop-blur-xl sm:p-8 shadow-[0_0_50px_rgba(124,58,237,0.06)] relative overflow-hidden group/board">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--color-brand)]/10 blur-[80px] transition-all duration-1000 group-hover/board:bg-[var(--color-brand)]/15" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-[var(--color-iris)]/10 blur-[80px] transition-all duration-1000 group-hover/board:bg-[var(--color-iris)]/15" />

        <div className="relative z-10 mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-black tracking-tight text-transparent bg-gradient-to-r from-white via-white to-white/70 bg-clip-text sm:text-3xl">Valorant Rankings</h2>
            <p className="mt-1 ml-1 text-sm text-white/40">Who runs Mangaluru? Live competitive RR from NTG players.</p>
          </div>
          <Link href="/esports/leaderboard" className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-white">
            View Full Rankings
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>

        {leaderboardData.entries.length === 0 ? (
          <div className="relative z-10 rounded-2xl border border-dashed border-white/10 py-12 text-center">
            <p className="text-sm text-white/40">Leaderboard active soon! Link your Riot ID and play to claim your spot.</p>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col gap-3">
            {[
              { entry: first, rank: 1, border: "border-amber-500/30", bg: "from-amber-500/[0.10]", num: "text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.65)]", glow: "hover:shadow-[0_0_40px_rgba(245,158,11,0.18)]", featured: true },
              { entry: second, rank: 2, border: "border-white/[0.09]", bg: "from-white/[0.04]", num: "text-white/90 drop-shadow-[0_0_12px_rgba(255,255,255,0.45)]", glow: "hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]", featured: false },
              { entry: third, rank: 3, border: "border-cyan-500/20", bg: "from-cyan-500/[0.06]", num: "text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.65)]", glow: "hover:shadow-[0_4px_20px_rgba(34,211,238,0.12)]", featured: false },
            ].map(({ entry, rank, border, bg, num, glow, featured }) =>
              entry ? (
                <div
                  key={rank}
                  className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border ${border} ${featured ? "backdrop-blur-md bg-gradient-to-r " + bg + " to-[#0D0D0D]/80 p-5" : "bg-gradient-to-r " + bg + " to-transparent p-4"} transition-all duration-300 hover:-translate-y-0.5 ${glow}`}
                >
                  {/* Portrait card rotated 90° — becomes a natural horizontal strip */}
                  {(entry.riotPlayerCardWide ?? entry.riotPlayerCard) && (
                    <>
                      <div
                        className={`pointer-events-none absolute inset-y-0 right-0 overflow-hidden transition-opacity duration-500 ${featured ? "w-56 opacity-55 group-hover:opacity-70" : "w-40 opacity-35 group-hover:opacity-50"}`}
                        style={{
                          maskImage: "linear-gradient(to left, black 30%, transparent 100%)",
                          WebkitMaskImage: "linear-gradient(to left, black 30%, transparent 100%)",
                        }}
                      >
                        <img
                          src={(entry.riotPlayerCardWide ?? entry.riotPlayerCard)!}
                          alt=""
                          aria-hidden
                          style={{
                            position: "absolute",
                            top: "50%",
                            right: entry.riotPlayerCardWide ? undefined : featured ? "140px" : "110px",
                            left: entry.riotPlayerCardWide ? "50%" : undefined,
                            // height pre-rotation = visual width post-rotation
                            height: entry.riotPlayerCardWide ? "100%" : featured ? "280px" : "220px",
                            width: entry.riotPlayerCardWide ? "100%" : "auto",
                            objectFit: entry.riotPlayerCardWide ? "cover" : undefined,
                            transform: entry.riotPlayerCardWide
                              ? "translate(-50%, -50%)"
                              : "translate(50%, -50%) rotate(90deg)",
                          }}
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/75 to-transparent" />
                    </>
                  )}

                  {/* Shimmer on hover — only for rank 1 */}
                  {featured && (
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-amber-400/10 to-transparent pointer-events-none z-20" />
                  )}

                  {/* Rank number */}
                  <span className={`relative z-10 font-display text-5xl font-black ${num} w-14 shrink-0 text-center leading-none`}>
                    {rank}
                    {rank === 1 && (
                      <span className="ml-0.5 align-top text-2xl">★</span>
                    )}
                  </span>

                  {/* Rank icon */}
                  <div className={`relative z-10 flex ${featured ? "h-12 w-12" : "h-10 w-10"} shrink-0 items-center justify-center`}>
                    {rankIconUrl(entry.rankTierId) ? (
                      <img src={rankIconUrl(entry.rankTierId)!} alt={entry.rankTier ?? "Rank"} className={`${featured ? "h-11 w-11" : "h-9 w-9"} object-contain`} />
                    ) : (
                      <div className={`${featured ? "h-11 w-11" : "h-9 w-9"} rounded-full bg-white/10`} />
                    )}
                  </div>

                  {/* Name + Riot ID */}
                  <div className="relative z-10 min-w-0 flex-1">
                    <p className={`font-display ${featured ? "text-lg" : "text-base"} font-black text-white truncate leading-tight`}>{entry.displayName}</p>
                    {entry.riotId && (
                      <p className="mt-0.5 text-[11px] text-white/40 truncate">{entry.riotId}</p>
                    )}
                    {featured && entry.rankTier && (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-400/70">{entry.rankTier}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div key={rank} className="flex items-center gap-4 rounded-2xl border border-dashed border-white/[0.06] p-4">
                  <span className="font-display text-4xl font-black text-white/10 w-8 text-center">{rank}</span>
                  <p className="text-xs text-white/25">Position vacant</p>
                </div>
              )
            )}
          </div>

        )}
      </div>

      {/* Champion Highlight Box */}
      {latestCompleted && (
        <Link
          href={`/esports/tournaments/${latestCompleted.slug}`}
          className="block rounded-[2rem] border border-amber-500/15 bg-gradient-to-br from-[#1E170A]/50 via-[#0A0A0A]/50 to-[#0A0A0A]/50 p-6 backdrop-blur-md sm:p-8 relative overflow-hidden group transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="absolute right-0 top-0 h-40 w-40 -translate-y-8 translate-x-8 rounded-full bg-amber-500/5 blur-[60px]" />
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-inset ring-amber-500/20">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-amber-400">Cup Winner Highlight</span>
              <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-white">
                {latestCompleted.championName} crowned champion of {latestCompleted.name}!
              </h3>
              <p className="mt-1 text-sm text-white/45">
                Shoutout to the winners of our most recently hosted tournament. Tap to view brackets and rosters.
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Cups we've hosted section */}
      <div className="rounded-[2rem] border border-white/[0.06] bg-[#0A0A0A]/40 p-6 backdrop-blur-md sm:p-8">
        <div className="mb-8">
          <h2 className="font-display text-2xl font-black tracking-tight text-transparent bg-gradient-to-r from-white via-white to-white/70 bg-clip-text sm:text-3xl">
            Cups we&apos;ve <span className="font-display italic font-light text-white/55">hosted.</span>
          </h2>
          <p className="mt-1 ml-0.5 text-sm text-white/40">Our latest community cups. Every champion etched into the lounge&apos;s history.</p>
        </div>
        <TournamentVaultSection hideHeader={true} />
      </div>


      {/* Glassmorphic Navigation Cards — moved to bottom */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/esports/roster" prefetch={true} className="group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0D0D0D]/60 p-8 shadow-lg backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-violet-500/50 hover:bg-[#100c18]/80 hover:shadow-[0_0_40px_rgba(124,58,237,0.15)] active:scale-[0.98]">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-violet-500/10 blur-[50px] transition-all group-hover:bg-violet-500/20" />
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 ring-1 ring-inset ring-violet-500/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="relative z-10 mt-auto pt-8">
            <h3 className="font-display text-2xl font-bold tracking-wide text-white">NTG Roster</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/50">Official teams, player cards, and open tryouts for NTG esports.</p>
          </div>
        </Link>

        <Link href="/esports/tournaments" prefetch={true} className="group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0D0D0D]/60 p-8 shadow-lg backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-iris)]/50 hover:bg-[#121016]/80 hover:shadow-[0_0_40px_rgba(124,58,237,0.15)] active:scale-[0.98]">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
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

        <Link href="/esports/leaderboard" prefetch={true} className="group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0D0D0D]/60 p-8 shadow-lg backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-brand)]/50 hover:bg-[#0c1417]/80 hover:shadow-[0_0_40px_rgba(34,211,238,0.15)] active:scale-[0.98]">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
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

        <Link href="/gallery" prefetch={true} className="group relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0D0D0D]/60 p-8 shadow-lg backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[#F43F5E]/50 hover:bg-[#170c0e]/80 hover:shadow-[0_0_40px_rgba(244,63,94,0.15)] active:scale-[0.98]">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
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
    </div>
  );
}
