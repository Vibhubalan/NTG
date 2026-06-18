import {
  handleGameProfileGet,
  handleGameProfilePatch,
} from "@auth-membership/api/register.handlers";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleGameProfileGet();
}

export async function PATCH(req: Request) {
  const limited = await enforceRateLimit(req, AUTH_RATE_LIMITS.profilePatch);
  if (limited) return limited;
  return handleGameProfilePatch(req);
}
