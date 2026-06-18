/**
 * Server-only environment variables.
 * Never import this file from client components.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const serverEnv = {
  get databaseUrl() {
    return optional("DATABASE_URL");
  },
  get authSecret() {
    return optional("AUTH_SECRET");
  },
  get authUrl() {
    return optional("AUTH_URL") ?? optional("NEXTAUTH_URL");
  },
  get resendApiKey() {
    return optional("RESEND_API_KEY");
  },
  get emailFrom() {
    return optional("EMAIL_FROM") ?? "NTG Lounge <onboarding@resend.dev>";
  },
  get henrikdevApiKey() {
    return optional("HENRIKDEV_API_KEY");
  },
  get steamWebApiKey() {
    return optional("STEAM_WEB_API_KEY");
  },
  get cronSecret() {
    return optional("CRON_SECRET");
  },
  get youtubeChannelId() {
    return optional("YOUTUBE_CHANNEL_ID");
  },
  get youtubeChannelUrl() {
    return optional("YOUTUBE_CHANNEL_URL");
  },
  get instagramReelUrls() {
    const raw = optional("INSTAGRAM_REEL_URLS");
    if (!raw) return [];
    return raw
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
  },
  get instagramReelThumbnails() {
    const raw = optional("INSTAGRAM_REEL_THUMBNAILS");
    if (!raw) return [];
    return raw
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
  },
  /** Pipe-separated reel captions (same order as INSTAGRAM_REEL_URLS). */
  get instagramReelCaptions() {
    const raw = optional("INSTAGRAM_REEL_CAPTIONS");
    if (!raw) return [];
    return raw
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
  },
  /** S3-compatible object storage (e.g. Cloudflare R2) — optional until credentials are set. */
  get s3():
    | {
        bucket: string;
        region: string;
        accessKeyId: string;
        secretAccessKey: string;
        publicUrl: string;
        endpoint: string;
      }
    | undefined {
    const bucket = optional("S3_BUCKET");
    const accessKeyId = optional("S3_ACCESS_KEY_ID");
    const secretAccessKey = optional("S3_SECRET_ACCESS_KEY");
    const publicUrl = optional("S3_PUBLIC_URL");
    const endpoint = optional("S3_ENDPOINT");
    if (!bucket || !accessKeyId || !secretAccessKey || !publicUrl || !endpoint) {
      return undefined;
    }
    return {
      bucket,
      region: optional("S3_REGION") ?? "auto",
      accessKeyId,
      secretAccessKey,
      publicUrl,
      endpoint,
    };
  },
  /** Throws if DATABASE_URL is missing — use in DB-backed routes only. */
  requireDatabaseUrl() {
    return required("DATABASE_URL");
  },
  /** Throws if auth env is missing — use in auth routes only. */
  requireAuth() {
    return {
      secret: required("AUTH_SECRET"),
      url: optional("AUTH_URL") ?? optional("NEXTAUTH_URL") ?? "http://localhost:3000",
    };
  },
} as const;
