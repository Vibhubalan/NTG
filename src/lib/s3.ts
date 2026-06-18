import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { serverEnv } from "@core/config/env.server";

let client: S3Client | null = null;

function getClient(): S3Client | null {
  const cfg = serverEnv.s3;
  if (!cfg) return null;
  if (!client) {
    client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }
  return client;
}

export function isS3Configured(): boolean {
  return Boolean(serverEnv.s3);
}

export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<{ ok: true; url: string; key: string } | { ok: false; error: string }> {
  const cfg = serverEnv.s3;
  const s3 = getClient();
  if (!cfg || !s3) {
    return { ok: false, error: "S3 storage is not configured." };
  }

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    const url = `${cfg.publicUrl.replace(/\/$/, "")}/${key}`;
    return { ok: true, url, key };
  } catch (e) {
    console.error("[s3] upload failed:", e);
    return { ok: false, error: "Upload failed." };
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  const cfg = serverEnv.s3;
  const s3 = getClient();
  if (!cfg || !s3) return;

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      }),
    );
  } catch (e) {
    console.error("[s3] delete failed:", e);
  }
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const TEAM_LOGO_MAX_BYTES = 10 * 1024 * 1024;

export function validateImageUpload(
  file: File,
  maxBytes = MAX_BYTES,
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Only JPEG, PNG, and WebP images are allowed." };
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, error: `Image must be ${mb} MB or smaller.` };
  }
  return { ok: true };
}

export function validateTeamLogoUpload(
  file: File,
): { ok: true } | { ok: false; error: string } {
  return validateImageUpload(file, TEAM_LOGO_MAX_BYTES);
}

export function sanitizeUploadKey(prefix: string, filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix.replace(/\/$/, "")}/${id}.${safeExt}`;
}
