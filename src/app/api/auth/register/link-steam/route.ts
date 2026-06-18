import { handleLinkSteamSignup } from "@auth-membership/api/register.handlers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleLinkSteamSignup(req);
}
