import { NextResponse } from "next/server";
import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import {
  createStage,
  getStageGraphAdmin,
  replaceStageGraph,
} from "@tournaments-leagues/index";
import type { StageGraphInput } from "@tournaments-leagues/domain/stages/types";
import type { StageType } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug } = await params;
  const skipRepair = new URL(req.url).searchParams.get("skipRepair") === "1";
  try {
    const graph = await getStageGraphAdmin(slug, {
      skipChainRepair: skipRepair,
    });
    return NextResponse.json(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load stages.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

/** Replace full stage graph (Stage Builder save). */
export async function PUT(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug } = await params;
  try {
    const body = (await req.json()) as StageGraphInput;
    const graph = await replaceStageGraph(slug, body);
    return NextResponse.json(graph);
  } catch (err) {
    const issues = (err as { issues?: unknown }).issues;
    const message = err instanceof Error ? err.message : "Failed to save stages.";
    return NextResponse.json({ error: message, issues }, { status: 400 });
  }
}

/** Add a stage. */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const { slug } = await params;
  try {
    const body = (await req.json()) as {
      name?: string;
      stageType?: StageType;
      matchFormat?: "BO1" | "BO3" | "BO5";
      seedingMethod?: string;
    };
    if (!body.stageType) {
      return NextResponse.json({ error: "stageType is required." }, { status: 400 });
    }
    const graph = await createStage(slug, {
      name: body.name ?? "New Stage",
      stageType: body.stageType,
      matchFormat: body.matchFormat,
      seedingMethod: body.seedingMethod as never,
    });
    return NextResponse.json(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create stage.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
