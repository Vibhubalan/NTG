import { handleCompleteSignup } from "@auth-membership/api/register.handlers";

export const dynamic = "force-dynamic";

export async function POST() {
  return handleCompleteSignup();
}
