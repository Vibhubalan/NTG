const TRANSIENT_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Connection timed out
  "P1008", // Operations timed out
  "P1017", // Server has closed the connection
  "P2024", // Timed out fetching a connection from the pool
]);

const ENGINE_FAULT_NAMES = new Set([
  "PrismaClientUnknownRequestError",
  "PrismaClientRustPanicError",
]);

function prismaErrorCode(error: object): string {
  if ("code" in error && error.code != null) return String(error.code);
  if ("errorCode" in error && error.errorCode != null) {
    return String(error.errorCode);
  }
  return "";
}

function prismaErrorMessage(error: object): string {
  return "message" in error ? String(error.message) : "";
}

function prismaErrorName(error: object): string {
  if ("name" in error && error.name != null) return String(error.name);
  return error.constructor?.name ?? "";
}

export function isPrismaPoolTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (prismaErrorCode(error) === "P2024") return true;
  return /Timed out fetching a new connection from the connection pool/i.test(
    prismaErrorMessage(error),
  );
}

/** The engine lost the socket. Disconnecting before retry can help. */
export function isDroppedPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = prismaErrorCode(error);
  if (code === "P1001" || code === "P1002" || code === "P1017") return true;
  const message = prismaErrorMessage(error);
  return (
    /Can't reach database server/i.test(message) ||
    /Server has closed the connection/i.test(message) ||
    /forcibly closed by the remote host/i.test(message) ||
    /ConnectionReset/i.test(message)
  );
}

/**
 * Query engine process died or was not ready yet (common after Turbopack HMR
 * on Windows). Retry after $connect, never $disconnect the shared client.
 */
export function isPrismaEngineFault(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = prismaErrorMessage(error);
  if (
    /Engine is not yet connected/i.test(message) ||
    /Response from the Engine was empty/i.test(message) ||
    /Engine is already starting/i.test(message)
  ) {
    return true;
  }
  return ENGINE_FAULT_NAMES.has(prismaErrorName(error));
}

/**
 * Pooler blips (idle disconnect, Windows 10054, DNS hiccup, pool wait)
 * and query-engine crashes. Unique-constraint and query errors are not included.
 */
export function isTransientPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (TRANSIENT_CODES.has(prismaErrorCode(error))) return true;
  return (
    isPrismaPoolTimeoutError(error) ||
    isDroppedPrismaConnectionError(error) ||
    isPrismaEngineFault(error)
  );
}

/**
 * Safe to retry on the shared Prisma client. Pool timeouts (P2024) are not:
 * retrying them holds slots even longer and starves the rest of the app,
 * which then 404s routes that never finished compiling.
 */
export function isRetryablePrismaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (isPrismaPoolTimeoutError(error)) return false;
  return isDroppedPrismaConnectionError(error) || isPrismaEngineFault(error);
}

/**
 * Modest pool against PgBouncer. connection_limit=1 starves Next.js because
 * listings, tryout sync, and the hero all query at once.
 */
export function withPrismaPoolerParams(raw: string): string {
  const add: string[] = [];
  if (!/[?&]connect_timeout=/.test(raw)) add.push("connect_timeout=10");
  if (!/[?&]pool_timeout=/.test(raw)) add.push("pool_timeout=10");
  if (!/[?&]connection_limit=/.test(raw)) add.push("connection_limit=8");
  const looksLikeTransactionPooler =
    /:6543(?:[/?]|$)/.test(raw) || /pooler\./i.test(raw);
  if (looksLikeTransactionPooler && !/[?&]pgbouncer=/.test(raw)) {
    add.push("pgbouncer=true");
  }
  if (add.length === 0) return raw;
  return `${raw}${raw.includes("?") ? "&" : "?"}${add.join("&")}`;
}

export async function withDbFallback<T>(
  label: string,
  fallback: T,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isTransientPrismaConnectionError(error)) throw error;
    console.warn(`[${label}] skipped (database unreachable)`);
    return fallback;
  }
}
