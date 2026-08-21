import { getLeaderboardLastCompletedRefresh } from "@/lib/leaderboard-last-refresh";

const GITHUB_API = "https://api.github.com";
const DAILY_WORKFLOW_FILE = "daily-leaderboard-refresh.yml";
const HOURLY_WORKFLOW_FILE = "hourly-leaderboard-refresh.yml";
const DEFAULT_REPO = "Vibhubalan/NTG";

export type DispatchDailyLeaderboardResult =
  | { ok: true; dispatched: true; skipped?: false }
  | { ok: true; dispatched: false; skipped: true; reason: string }
  | { ok: false; reason: string };

export type DispatchHourlyLeaderboardResult = DispatchDailyLeaderboardResult;

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
  workflowFile: string,
): Promise<boolean> {
  const url = `${GITHUB_API}/repos/${owner}/${name}/actions/workflows/${workflowFile}/runs?status=in_progress&per_page=1`;
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

async function dispatchWorkflow(
  workflowFile: string,
  options: { skipIfInProgress?: boolean; logLabel: string } = {
    skipIfInProgress: true,
    logLabel: workflowFile,
  },
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

  if (
    options.skipIfInProgress !== false &&
    (await hasInProgressWorkflowRun(token, owner, name, workflowFile))
  ) {
    return {
      ok: true,
      dispatched: false,
      skipped: true,
      reason: "GitHub Actions workflow already in progress.",
    };
  }

  const ref = process.env.GITHUB_ACTIONS_REF?.trim() || "main";
  const url = `${GITHUB_API}/repos/${owner}/${name}/actions/workflows/${workflowFile}/dispatches`;

  const response = await fetch(url, {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify({ ref }),
  });

  if (response.status === 204) {
    console.info(`[github-actions-dispatch] Dispatched ${options.logLabel}`, { ref });
    return { ok: true, dispatched: true };
  }

  const body = await response.text().catch(() => "");
  return {
    ok: false,
    reason: `GitHub dispatch failed (${response.status}): ${body.slice(0, 300)}`,
  };
}

/**
 * Triggers the daily leaderboard GitHub Actions workflow via workflow_dispatch.
 * Kept for manual / emergency full sync (hits /api/cron/sync-ranks).
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

  return dispatchWorkflow(DAILY_WORKFLOW_FILE, {
    skipIfInProgress: true,
    logLabel: DAILY_WORKFLOW_FILE,
  });
}

/**
 * Triggers the hourly full-board GitHub Actions workflow (6 AM IST kick from Vercel).
 */
export async function dispatchHourlyLeaderboardWorkflow(): Promise<DispatchHourlyLeaderboardResult> {
  return dispatchWorkflow(HOURLY_WORKFLOW_FILE, {
    skipIfInProgress: true,
    logLabel: HOURLY_WORKFLOW_FILE,
  });
}
