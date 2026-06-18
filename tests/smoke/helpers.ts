export const SMOKE_BASE_URL =
  process.env.SMOKE_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export async function smokeAvailable(): Promise<boolean> {
  try {
    const res = await fetch(SMOKE_BASE_URL, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    return res.status >= 200 && res.status < 500;
  } catch {
    return false;
  }
}

export async function getPath(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; location: string | null; body: unknown; text?: string }> {
  const res = await fetch(`${SMOKE_BASE_URL}${path}`, {
    redirect: "manual",
    ...init,
  });
  const location = res.headers.get("location");
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = await res.json();
    return { status: res.status, location, body };
  }
  const text = await res.text();
  return { status: res.status, location, body: null, text };
}

export function expectLoginRedirect(
  status: number,
  location: string | null,
  callbackPath?: string,
): void {
  const redirected = status === 307 || status === 302 || status === 303;
  if (!redirected || !location?.includes("/login")) {
    throw new Error(`Expected login redirect, got status=${status} location=${location}`);
  }
  if (callbackPath && !location.includes(callbackPath)) {
    throw new Error(`Expected callback ${callbackPath} in ${location}`);
  }
}
