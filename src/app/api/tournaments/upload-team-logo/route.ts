import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import { isS3Configured, sanitizeUploadKey, uploadToS3, validateTeamLogoUpload } from "@/lib/s3";
import { serverEnv } from "@core/config/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "S3 storage is not configured." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const validation = validateTeamLogoUpload(file);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = sanitizeUploadKey("team-logos", file.name);
  const result = await uploadToS3(key, buffer, file.type);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: result.url, key: result.key });
}
