import Link from "next/link";
import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";
import { AuctionRulesEditor } from "@/components/admin/AuctionRulesEditor";

export const metadata = { title: "Admin · Auction" };
export const dynamic = "force-dynamic";

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function sessionBadge(status: string | null) {
  const map: Record<string, string> = {
    LIVE: "border-red-500/30 bg-red-500/10 text-red-300",
    PAUSED: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    SHOWCASE: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    IDLE: "border-white/15 bg-white/[0.04] text-white/60",
    COMPLETE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
  const label = status ?? "NO SESSION";
  const cls = status ? map[status] ?? map.IDLE : "border-white/10 bg-white/[0.02] text-white/35";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${cls}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

export default async function AdminAuctionPage() {
  const cups = serverEnv.databaseUrl
    ? await prisma.tournament.findMany({
        where: { registrationFormat: "AUCTION" },
        orderBy: { createdAt: "desc" },
        select: {
          slug: true,
          name: true,
          game: true,
          status: true,
          registrationOpensAt: true,
          registrationClosesAt: true,
          auctionStartsAt: true,
          auctionEndsAt: true,
          auctionSession: { select: { id: true, status: true } },
          _count: { select: { registrations: true } },
        },
      })
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">Auction</h1>
        <p className="mt-1 text-sm text-white/40">
          Run live player auctions, manage queues and rosters, and configure global auction rules.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-white/45">
          Auction cups ({cups.length})
        </h2>
        {cups.length === 0 ? (
          <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-6 text-sm text-white/40">
            No auction-format cups yet. Create a cup with the Auction registration format under Cups.
          </p>
        ) : (
          <ul className="grid gap-3">
            {cups.map((cup) => (
              <li key={cup.slug}>
                <Link
                  href={`/admin/auction/${cup.slug}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#0c1424]/30 px-5 py-4 transition-all hover:border-amber-500/20 hover:bg-[#121c32]/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-white transition-colors group-hover:text-amber-400">
                        {cup.name}
                      </span>
                      <span className="rounded-md border border-white/[0.05] bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/50">
                        {cup.game.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-white/40">
                      Registration {fmtDate(cup.registrationOpensAt)} → {fmtDate(cup.registrationClosesAt)}
                      {" · "}
                      Auction {fmtDate(cup.auctionStartsAt)} → {fmtDate(cup.auctionEndsAt)}
                      {" · "}
                      {cup._count.registrations} registrations
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {sessionBadge(cup.auctionSession?.status ?? null)}
                    <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500/80 transition-all group-hover:translate-x-0.5 group-hover:text-amber-400">
                      Dashboard
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AuctionRulesEditor />
    </div>
  );
}
