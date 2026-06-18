import { handleLinkSteamProfile } from "@auth-membership/api/register.handlers";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, AUTH_RATE_LIMITS.steamLink);
  if (limited) return limited;
  return handleLinkSteamProfile(req);
}
