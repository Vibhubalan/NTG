import { handleLinkSteamProfile } from "@auth-membership/api/register.handlers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleLinkSteamProfile(req);
}
