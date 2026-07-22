import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import {
  commitStageAndGenerate,
  commitStageDraftsForGenerate,
  finalizeStageMatchGeneration,
  insertStageMatchGenerationBatch,
  prepareStageMatchGeneration,
  seedStageForMatchGeneration,
  type StageCommitDraft,
} from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ slug: string; stageId: string }> };

type GenerateBody = {
  phase?: "commit" | "seed" | "prepare" | "insert" | "finalize";
  drafts?: StageCommitDraft[];
  cursor?: number;
};

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, stageId } = await params;
  try {
    const body = (await req.json().catch(() => ({}))) as GenerateBody;
    const phase = body.phase ?? "prepare";

    if (phase === "commit") {
      if (!body.drafts?.length) {
        return NextResponse.json({ error: "Missing drafts." }, { status: 400 });
      }
      const result = await commitStageDraftsForGenerate(
        slug,
        stageId,
        body.drafts,
      );
      return NextResponse.json({ ok: true, ...result });
    }

    if (phase === "seed") {
      const result = await seedStageForMatchGeneration(
        slug,
        stageId,
        body.drafts?.find((d) => d.id === stageId),
      );
      return NextResponse.json({ ok: true, ...result });
    }

    if (phase === "prepare") {
      if (body.drafts?.length) {
        const result = await commitStageAndGenerate(slug, stageId, body.drafts);
        return NextResponse.json(result);
      }
      const result = await prepareStageMatchGeneration(slug, stageId);
      return NextResponse.json(result);
    }

    if (phase === "insert") {
      const cursor =
        typeof body.cursor === "number" && Number.isFinite(body.cursor)
          ? Math.max(0, Math.floor(body.cursor))
          : 0;
      const result = await insertStageMatchGenerationBatch(
        slug,
        stageId,
        cursor,
      );
      return NextResponse.json(result);
    }

    if (phase === "finalize") {
      const result = await finalizeStageMatchGeneration(slug, stageId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid phase." }, { status: 400 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate matches.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
