import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import {
  syncAllStages,
  type StageCommitDraft,
} from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const maxDuration = 120;

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug } = await params;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      drafts?: StageCommitDraft[];
    };
    if (!body.drafts?.length) {
      return NextResponse.json(
        { error: "drafts are required." },
        { status: 400 },
      );
    }
    const result = await syncAllStages(slug, body.drafts);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sync stages.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
