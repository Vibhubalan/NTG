import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SINGLETON_ID = "singleton";

const DEFAULT_CONTENT = {
  hero: {
    headline1: "WHERE LEGENDS",
    headline2: "ARE MADE",
    subtext: "Join the premier esports community at Amity University Chennai. Compete. Connect. Conquer.",
    ctaLabel: "Join Now",
    ctaUrl: "/register",
    secondaryCtaLabel: "Explore Events",
    secondaryCtaUrl: "/esports",
  },
  specs: [
    { label: "Active Members", value: "500+" },
    { label: "Tournaments Hosted", value: "20+" },
    { label: "Prize Pool", value: "₹1L+" },
    { label: "Games", value: "3" },
  ],
  features: {
    heading: "WHY JOIN NTG?",
    items: [
      { title: "Competitive Esports", description: "Participate in structured tournaments across Valorant, CS2, and EA FC26 with real prize pools." },
      { title: "Skill Development", description: "Train with the best. Learn strategies, teamwork, and mechanics from top players in the community." },
      { title: "Community & Events", description: "Beyond tournaments — LAN parties, watch parties, and social events that build lasting friendships." },
    ],
  },
  hours: "Mon–Fri: 9 AM – 9 PM | Sat–Sun: 10 AM – 8 PM",
  performance: {
    championshipSlides: [
      "/arena/arena-tournament.png",
      "/arena/arena-finals.png",
      "/arena/arena-focus.png",
      "/arena/arena-ntg-station.png",
      "/arena/arena-competitive.png",
    ],
    auctionNightsImage: "/arena/arena-tournament.png",
  },
};

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const row = await prisma.homepageContent.findUnique({ where: { id: SINGLETON_ID } });
  const content = row ? row.content : DEFAULT_CONTENT;

  return NextResponse.json({ content });
}

export async function PATCH(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  let body: { content: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.content || typeof body.content !== "object") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const row = await prisma.homepageContent.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, content: body.content as import("@prisma/client").Prisma.InputJsonValue },
    update: { content: body.content as import("@prisma/client").Prisma.InputJsonValue },
  });

  return NextResponse.json({ ok: true, updatedAt: row.updatedAt });
}
