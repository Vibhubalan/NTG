import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { deleteStage, updateStage } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ slug: string; stageId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, stageId } = await params;
  try {
    const body = await req.json();
    const graph = await updateStage(slug, stageId, body);
    return NextResponse.json(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update stage.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug, stageId } = await params;
  try {
    const graph = await deleteStage(slug, stageId);
    return NextResponse.json(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete stage.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
