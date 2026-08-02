import { NextResponse } from "next/server";
import { fetchChallongeBracket } from "@/lib/challonge-api";
import { normalizeBracketUrlItems } from "@/lib/challonge";
import { getTournamentDetail } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/** Lazy Challonge load — keeps cup page TTFB free of external bracket fetches. */
export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;
  const tournament = await getTournamentDetail(slug);
  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isCompleted = tournament.status === "COMPLETED";
  const bracketItems = normalizeBracketUrlItems({
    bracketUrl: tournament.bracketUrl,
    bracketUrls: tournament.bracketUrls,
  });

  if (bracketItems.length === 0) {
    return NextResponse.json({ brackets: [] });
  }

  const brackets = await Promise.all(
    bracketItems.map(async (item) => ({
      url: item.url,
      name: item.name ?? null,
      isFinal: item.isFinal !== false,
      bracket: await fetchChallongeBracket(item.url, isCompleted),
    })),
  );

  return NextResponse.json(
    { brackets },
    {
      headers: {
        // Let list-hover / mount prefetches reuse a short browser cache.
        "Cache-Control": isCompleted
          ? "private, max-age=120, stale-while-revalidate=600"
          : "private, max-age=30, stale-while-revalidate=120",
      },
    },
  );
}
