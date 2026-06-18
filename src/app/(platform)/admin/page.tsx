import Link from "next/link";
import { listTournamentsAdmin } from "@tournaments-leagues/index";
import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";

export const metadata = { title: "Admin Dashboard" };

const quickLinks = [
  {
    href: "/admin/tournaments",
    title: "Cups",
    showsOn: "Esports Hub, Tournament Detail Pages, Archives",
    desc: "Create and configure tournament structures, upload posters, set prizepools, manage participating teams, and document brackets.",
    color: "from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/10",
    icon: (
      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a4 4 0 004-4V5H8v6a4 4 0 004 4zM12 15v4m-3 0h6M5 7h3m8 0h3M5 7a2 2 0 012-2m10 4a2 2 0 002-2" />
      </svg>
    ),
  },
  {
    href: "/admin/members",
    title: "Members",
    showsOn: "Authentication, Riot ID Rankings",
    desc: "Manage user registrations, assign roles, update passwords, link Riot IDs (RiotName#Tag), and inspect user activity metrics.",
    color: "from-indigo-500/20 to-cyan-500/20 text-indigo-300 border-indigo-500/10",
    icon: (
      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/moments",
    title: "Moments",
    showsOn: "Media Gallery, Esports Hub Reels Collage",
    desc: "Curate front-page collages, featured slideshows, and link Instagram reels directly to the media center gallery pages.",
    color: "from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/10",
    icon: (
      <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default async function AdminDashboardPage() {
  const tournaments = serverEnv.databaseUrl ? await listTournamentsAdmin() : [];
  const memberCount = serverEnv.databaseUrl ? await prisma.user.count() : 0;
  const openCup = tournaments.find((t) => t.status === "REGISTRATION_OPEN");

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-400">
          Superuser Access
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Control Center
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-white/40">
          Configure site components, manage players, and curate media. Live display location overlays help target changes.
        </p>
      </div>

      {/* Live cup alert banner */}
      {openCup ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-6 py-5 shadow-2xl backdrop-blur-md">
          <div className="absolute right-0 top-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-emerald-500/5 blur-xl" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/90">Live Registration Open</p>
                <p className="mt-0.5 font-semibold text-white text-lg">{openCup.name}</p>
                <p className="text-xs text-white/45">Visible on the primary Esports Hub cards</p>
              </div>
            </div>
            <Link 
              href={`/admin/tournaments/${openCup.slug}`} 
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 border border-emerald-500/25 transition-all hover:bg-emerald-500/20 hover:text-white"
            >
              Configure registration →
            </Link>
          </div>
        </div>
      ) : null}

      {/* Statistics Section */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Stat 1: Cups */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c1424]/40 p-5 shadow-xl backdrop-blur-sm group hover:border-amber-500/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-3xl font-extrabold text-white tracking-tight">{tournaments.length}</p>
              <p className="mt-1 text-xs font-medium text-white/40 uppercase tracking-wider">Total Cups</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a4 4 0 004-4V5H8v6a4 4 0 004 4zM12 15v4m-3 0h6M5 7h3m8 0h3M5 7a2 2 0 012-2m10 4a2 2 0 002-2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Stat 2: Members */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c1424]/40 p-5 shadow-xl backdrop-blur-sm group hover:border-indigo-500/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-3xl font-extrabold text-white tracking-tight">{memberCount}</p>
              <p className="mt-1 text-xs font-medium text-white/40 uppercase tracking-wider">Registered Members</p>
            </div>
            <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Stat 3: Status */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c1424]/40 p-5 shadow-xl backdrop-blur-sm group hover:border-emerald-500/20 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-3xl font-extrabold tracking-tight ${openCup ? "text-emerald-400" : "text-white/70"}`}>
                {openCup ? "Active" : "None"}
              </p>
              <p className="mt-1 text-xs font-medium text-white/40 uppercase tracking-wider">Registration Hub</p>
            </div>
            <div className={`rounded-xl p-2.5 group-hover:scale-110 transition-transform duration-300 ${openCup ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/30"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links / Main Panels Grid */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Quick Management Links</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#0c1424]/30 p-6 shadow-xl backdrop-blur-sm transition-all duration-350 hover:-translate-y-1 hover:border-white/[0.12] hover:bg-[#121c32]/50 hover:shadow-2xl`}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2 transition-colors group-hover:bg-white/[0.06]">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-white text-lg group-hover:text-amber-400 transition-colors">{item.title}</h3>
                </div>
                
                <div>
                  <p className="text-[10px] font-semibold text-cyan-400/85 uppercase tracking-wide">Shows On</p>
                  <p className="mt-0.5 text-xs text-white/50 font-medium">{item.showsOn}</p>
                </div>

                <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/55 transition-colors">
                  {item.desc}
                </p>
              </div>
              
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-amber-500/80 group-hover:text-amber-400 group-hover:translate-x-1 transition-all">
                Open panel
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

