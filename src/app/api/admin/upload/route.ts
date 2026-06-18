import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { isS3Configured, sanitizeUploadKey, uploadToS3, validateImageBuffer, validateImageUpload } from "@/lib/s3";
import { serverEnv } from "@core/config/env.server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "S3 storage is not configured. Add S3_* env vars." },
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
  const prefix = (formData.get("prefix") as string | null)?.trim() || "uploads";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const validation = validateImageUpload(file);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const magic = validateImageBuffer(buffer);
  if (!magic.ok) {
    return NextResponse.json({ error: magic.error }, { status: 400 });
  }

  const key = sanitizeUploadKey(prefix, file.name);
  const result = await uploadToS3(key, buffer, magic.contentType);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await logAdminAction(auth.userId, "upload.create", key, { prefix });

  return NextResponse.json({ ok: true, url: result.url, key: result.key });
}
