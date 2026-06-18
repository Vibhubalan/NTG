import { auth } from "@auth-membership/index";

export async function getSession() {
  if (!auth) return null;
  try {
    return await auth();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "JWTSessionError" ||
        error.message.includes("no matching decryption secret"))
    ) {
      return null;
    }
    throw error;
  }
}
