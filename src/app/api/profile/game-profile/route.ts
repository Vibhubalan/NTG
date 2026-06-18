import {
  handleGameProfileGet,
  handleGameProfilePatch,
} from "@auth-membership/api/register.handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleGameProfileGet();
}

export async function PATCH(req: Request) {
  return handleGameProfilePatch(req);
}
