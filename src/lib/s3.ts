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
const RULEBOOK_MAX_BYTES = 15 * 1024 * 1024;
const RULEBOOK_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

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

export function validateImageBuffer(
  buffer: Buffer,
): { ok: true; contentType: string } | { ok: false; error: string } {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ok: true, contentType: "image/jpeg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { ok: true, contentType: "image/png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ok: true, contentType: "image/webp" };
  }
  return { ok: false, error: "File content is not a valid JPEG, PNG, or WebP image." };
}

export function validateTeamLogoUpload(
  file: File,
): { ok: true } | { ok: false; error: string } {
  return validateImageUpload(file, TEAM_LOGO_MAX_BYTES);
}

export function validateRulebookUpload(
  file: File,
): { ok: true } | { ok: false; error: string } {
  if (!RULEBOOK_TYPES.has(file.type)) {
    return { ok: false, error: "Only PDF and Word documents (.pdf, .doc, .docx) are allowed." };
  }
  if (file.size > RULEBOOK_MAX_BYTES) {
    return { ok: false, error: "Rulebook must be 15 MB or smaller." };
  }
  return { ok: true };
}

export function validateDocumentBuffer(
  buffer: Buffer,
  fileName: string,
): { ok: true; contentType: string } | { ok: false; error: string } {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "%PDF") {
    return { ok: true, contentType: "application/pdf" };
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return { ok: true, contentType: "application/msword" };
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04 &&
    ext === "docx"
  ) {
    return {
      ok: true,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  return { ok: false, error: "File content is not a valid PDF or Word document." };
}

export function sanitizeUploadKey(prefix: string, filename: string, kind: "image" | "document" = "image"): string {
  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "jpg";
  const imageExts = ["jpg", "jpeg", "png", "webp"];
  const docExts = ["pdf", "doc", "docx"];
  const allowed = kind === "document" ? docExts : imageExts;
  const safeExt = allowed.includes(ext) ? ext : allowed[0];
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix.replace(/\/$/, "")}/${id}.${safeExt}`;
}
