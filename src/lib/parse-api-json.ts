/** Parse fetch response as JSON; surface plain-text/HTML error bodies from proxies. */
export async function parseApiJson(res: Response): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; message: string }
> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      ok: false,
      message: res.ok ? "Empty response from server." : `Request failed (${res.status}).`,
    };
  }

  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    return { ok: true, data };
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 160);
    // Vercel FUNCTION_INVOCATION_TIMEOUT / crash pages often start with "An error occurred..."
    if (/^An error o/i.test(snippet) || /FUNCTION_INVOCATION_TIMEOUT/i.test(snippet)) {
      return {
        ok: false,
        message:
          "Server timed out while processing this request. Try again, or do fewer matches at once.",
      };
    }
    if (/^<!DOCTYPE/i.test(snippet) || /^<html/i.test(snippet)) {
      return {
        ok: false,
        message: `Request failed (${res.status}) — server returned a web page instead of JSON.`,
      };
    }
    return {
      ok: false,
      message: snippet || `Request failed (${res.status}).`,
    };
  }
}

/** Parse JSON and throw a readable Error on proxy/HTML failures or HTTP errors. */
export async function requireApiJson(res: Response): Promise<Record<string, unknown>> {
  const parsed = await parseApiJson(res);
  if (!parsed.ok) throw new Error(parsed.message);
  if (!res.ok) {
    throw new Error(String(parsed.data.error ?? `Request failed (${res.status}).`));
  }
  return parsed.data;
}
