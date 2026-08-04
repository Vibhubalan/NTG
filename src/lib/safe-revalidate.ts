import { revalidateTag } from "next/cache";

/**
 * Expire a cache tag immediately, without letting cache bookkeeping break the
 * write that triggered it.
 *
 * `revalidateTag` throws when there is no Next.js request context (scripts,
 * cron jobs invoked outside a route, tests), so a publish/edit must never
 * depend on it succeeding — the tagged reads also carry a time-based
 * `revalidate` backstop.
 */
export function safeExpireTag(tag: string): void {
  try {
    revalidateTag(tag, { expire: 0 });
  } catch (error) {
    console.warn(`[cache] failed to expire tag ${tag}:`, error);
  }
}
