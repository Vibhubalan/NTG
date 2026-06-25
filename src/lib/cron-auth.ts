import { serverEnv } from "@core/config/env.server";

export function isCronAuthorized(req: Request): boolean {
  const secret = serverEnv.cronSecret?.trim();
  if (!secret) return false;

  const auth = req.headers.get("authorization")?.trim();
  if (auth === `Bearer ${secret}`) return true;

  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer === secret;
}
