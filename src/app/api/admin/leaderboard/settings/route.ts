import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { isSuperAdminEmail } from "@/lib/superadmin";
import {
  buildActKeyFromParts,
  getValorantActSettingResponse,
  setValorantActSetting,
} from "@/lib/valorant-act-settings";
import { formatValorantActLabel, parseValorantActSeasonKey } from "@/lib/valorant-act";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PutBody = {
  actKey?: string;
  episode?: number;
  act?: number;
  prefix?: "e" | "s";
};

function parseActFromBody(body: PutBody): string | null {
  if (typeof body.actKey === "string" && body.actKey.trim()) {
    return parseValorantActSeasonKey(body.actKey);
  }

  if (typeof body.episode === "number" && typeof body.act === "number") {
    const prefix = body.prefix === "s" ? "s" : "e";
    return buildActKeyFromParts(body.episode, body.act, prefix);
  }

  return null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  try {
    const act = await getValorantActSettingResponse();
    const email = auth.session.user.email;
    return NextResponse.json({
      ...act,
      canEditAct: isSuperAdminEmail(email),
    });
  } catch (err) {
    console.error("[admin/leaderboard/settings GET]", err);
    return NextResponse.json({ error: "Could not load act settings." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  if (!isSuperAdminEmail(auth.session.user.email)) {
    return NextResponse.json(
      { error: "Only the superadmin can change the current Valorant act." },
      { status: 403 },
    );
  }

  let body: PutBody = {};
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const actKey = parseActFromBody(body);
  if (!actKey) {
    return NextResponse.json(
      { error: "Enter a valid episode and act (e.g. episode 11, act 3)." },
      { status: 400 },
    );
  }

  try {
    const previous = await getValorantActSettingResponse();
    const saved = await setValorantActSetting(actKey, auth.userId);

    await logAdminAction(auth.userId, "leaderboard.setAct", actKey, {
      actKey: saved.actKey,
      actLabel: saved.actLabel,
      previousActKey: previous.saved?.actKey ?? null,
      previousActLabel: previous.saved?.actLabel ?? null,
    });

    return NextResponse.json({
      ok: true,
      saved,
      savedLabel: formatValorantActLabel(saved.actKey),
    });
  } catch (err) {
    console.error("[admin/leaderboard/settings PUT]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save act." },
      { status: 500 },
    );
  }
}
