import { getLeaderboardLastCompletedRefresh } from "@/lib/leaderboard-last-refresh";

const GITHUB_API = "https://api.github.com";
const WORKFLOW_FILE = "daily-leaderboard-refresh.yml";
const DEFAULT_REPO = "Vibhubalan/NTG";

export type DispatchDailyLeaderboardResult =
  | { ok: true; dispatched: true; skipped?: false }
  | { ok: true; dispatched: false; skipped: true; reason: string }
  | { ok: false; reason: string };

function githubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function hasInProgressWorkflowRun(
  token: string,
  owner: string,
  name: string,
): Promise<boolean> {
  const url = `${GITHUB_API}/repos/${owner}/${name}/actions/workflows/${WORKFLOW_FILE}/runs?status=in_progress&per_page=1`;
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (!response.ok) return false;
  const data = (await response.json()) as { total_count?: number };
  return (data.total_count ?? 0) > 0;
}

async function completedRefreshWithinHours(hours: number): Promise<boolean> {
  const last = await getLeaderboardLastCompletedRefresh();
  if (!last) return false;
  const ageMs = Date.now() - Date.parse(last);
  return ageMs >= 0 && ageMs < hours * 60 * 60 * 1000;
}

export type DispatchOptions = {
  /** When true, skip if a refresh completed in the last 20 hours or a run is in progress. */
  backup?: boolean;
};

/**
 * Triggers the daily leaderboard GitHub Actions workflow via workflow_dispatch.
 * Vercel cron calls this — more reliable than GHA's native schedule trigger.
 */
export async function dispatchDailyLeaderboardWorkflow(
  options: DispatchOptions = {},
): Promise<DispatchDailyLeaderboardResult> {
  const token = process.env.GITHUB_ACTIONS_DISPATCH_TOKEN?.trim();
  if (!token) {
    return { ok: false, reason: "GITHUB_ACTIONS_DISPATCH_TOKEN not configured." };
  }

  const repo = process.env.GITHUB_ACTIONS_REPO?.trim() || DEFAULT_REPO;
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    return { ok: false, reason: `Invalid GITHUB_ACTIONS_REPO: ${repo}` };
  }

  if (options.backup) {
    if (await completedRefreshWithinHours(20)) {
      return {
        ok: true,
        dispatched: false,
        skipped: true,
        reason: "Daily refresh already completed within the last 20 hours.",
      };
    }
  }

  if (await hasInProgressWorkflowRun(token, owner, name)) {
    return {
      ok: true,
      dispatched: false,
      skipped: true,
      reason: "GitHub Actions workflow already in progress.",
    };
  }

  const ref = process.env.GITHUB_ACTIONS_REF?.trim() || "main";
  const url = `${GITHUB_API}/repos/${owner}/${name}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

  const response = await fetch(url, {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify({ ref }),
  });

  if (response.status === 204) {
    console.info("[github-actions-dispatch] Dispatched daily-leaderboard-refresh.yml", {
      ref,
      backup: options.backup ?? false,
    });
    return { ok: true, dispatched: true };
  }

  const body = await response.text().catch(() => "");
  return {
    ok: false,
    reason: `GitHub dispatch failed (${response.status}): ${body.slice(0, 300)}`,
  };
}
