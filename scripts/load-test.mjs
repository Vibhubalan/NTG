#!/usr/bin/env node
/**
 * Progressive load test — ramps concurrency until failure threshold.
 * Usage: node scripts/load-test.mjs [baseUrl]
 * Requires dev or prod server running.
 */

const BASE = (process.argv[2] ?? process.env.LOAD_TEST_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

const ROUTES = [
  "/",
  "/esports",
  "/esports/tournaments",
  "/esports/leaderboard",
  "/gallery",
  "/login",
  "/api/tournaments/fc26-cup-1",
  "/api/reviews",
];

const PHASES = [5, 10, 20, 35, 50, 75, 100];
const PHASE_DURATION_MS = 12_000;
const ERROR_RATE_BREAK = 0.15;
const P95_BREAK_MS = 12_000;

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function hitRoute(path) {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const ms = performance.now() - start;
    const ok = res.status >= 200 && res.status < 500;
    return { ok, ms, status: res.status, path, error: null };
  } catch (err) {
    return {
      ok: false,
      ms: performance.now() - start,
      status: 0,
      path,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function worker(stopAt) {
  const results = [];
  let i = 0;
  while (Date.now() < stopAt) {
    const path = ROUTES[i % ROUTES.length];
    i += 1;
    results.push(await hitRoute(path));
  }
  return results;
}

async function runPhase(concurrency) {
  const stopAt = Date.now() + PHASE_DURATION_MS;
  const workers = Array.from({ length: concurrency }, () => worker(stopAt));
  const batches = await Promise.all(workers);
  const results = batches.flat();

  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  const errorRate = failed / Math.max(1, results.length);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const max = latencies[latencies.length - 1] ?? 0;

  const statusCounts = {};
  const errorSamples = [];
  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    if (!r.ok && errorSamples.length < 3) {
      errorSamples.push(`${r.path} → ${r.error ?? r.status}`);
    }
  }

  return {
    concurrency,
    total: results.length,
    ok,
    failed,
    errorRate,
    p50: Math.round(p50),
    p95: Math.round(p95),
    max: Math.round(max),
    statusCounts,
    errorSamples,
    broken: errorRate >= ERROR_RATE_BREAK || p95 >= P95_BREAK_MS,
  };
}

async function main() {
  console.log(`Load test → ${BASE}`);
  console.log(`Routes: ${ROUTES.join(", ")}`);
  console.log(`Break when error rate ≥ ${ERROR_RATE_BREAK * 100}% or p95 ≥ ${P95_BREAK_MS}ms\n`);

  const probe = await hitRoute("/");
  if (!probe.ok && probe.error) {
    console.error(`Server unreachable: ${probe.error}`);
    process.exit(1);
  }

  const summary = [];
  let brokeAt = null;

  for (const concurrency of PHASES) {
    const phase = await runPhase(concurrency);
    summary.push(phase);

    console.log(
      `[${concurrency} concurrent] ${phase.total} reqs | ok ${phase.ok} fail ${phase.failed} (${(phase.errorRate * 100).toFixed(1)}%) | p50 ${phase.p50}ms p95 ${phase.p95}ms max ${phase.max}ms`,
    );
    if (phase.errorSamples.length) {
      console.log(`  errors: ${phase.errorSamples.join("; ")}`);
    }

    if (phase.broken) {
      brokeAt = phase;
      console.log(`\n⚠ Break threshold hit at ${concurrency} concurrent workers.`);
      break;
    }
  }

  if (!brokeAt) {
    console.log(`\n✓ Completed all phases through ${PHASES[PHASES.length - 1]} concurrent without breaking.`);
  }

  const report = {
    base: BASE,
    brokeAt: brokeAt?.concurrency ?? null,
    breakReason: brokeAt
      ? brokeAt.errorRate >= ERROR_RATE_BREAK
        ? "error_rate"
        : "latency_p95"
      : null,
    phases: summary,
    testedAt: new Date().toISOString(),
  };

  console.log("\n--- JSON summary ---");
  console.log(JSON.stringify(report, null, 2));

  process.exit(brokeAt ? 1 : 0);
}

main();
