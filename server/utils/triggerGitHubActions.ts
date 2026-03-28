import https from "https";
import { QA_CHANNEL } from "./slackClient";

export interface TriggerOptions {
  suite: string;
  browser: string;
  slackChannel: string;
  triggeredBy: string;
}

/**
 * Fires a repository_dispatch event on the pallet-pos-tests GitHub repo.
 * The Actions workflow listens for event_type "playwright-test".
 */
export async function triggerGitHubActions(opts: TriggerOptions): Promise<void> {
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo  = process.env.GITHUB_REPO_NAME;

  if (!token || !owner || !repo) {
    throw new Error(
      "Missing: GITHUB_PERSONAL_ACCESS_TOKEN, GITHUB_REPO_OWNER, or GITHUB_REPO_NAME"
    );
  }

  const payload = JSON.stringify({
    event_type: "playwright-test",
    client_payload: {
      suite:         opts.suite,
      browser:       opts.browser,
      slack_channel: opts.slackChannel || QA_CHANNEL,
      triggered_by:  opts.triggeredBy,
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.github.com",
        path: `/repos/${owner}/${repo}/dispatches`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Authorization: `Bearer ${token}`,
          "User-Agent": "pallet-pos-tests-slack-bridge/1.0",
          Accept: "application/vnd.github.v3+json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode === 204) resolve();
          else reject(new Error(`GitHub API ${res.statusCode}: ${data}`));
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
