/**
 * reporters/slack-reporter.ts
 *
 * Custom Playwright reporter that posts test results directly to the
 * #qa-automation Slack channel when a run completes.
 *
 * Activated automatically in CI when SLACK_BOT_TOKEN is set.
 * Can also be triggered manually for local runs.
 *
 * Uses the same postSlackMessage / buildResultBlocks helpers as the server.
 */

import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import https from "https";

const QA_CHANNEL = process.env.SLACK_CHANNEL || "#qa-automation";

// ── Minimal inline Slack poster (no server dependency) ────────────────────────
async function postToSlack(channel: string, text: string, blocks?: object[]): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return; // silently skip if no token (local dev without Slack)

  const body = JSON.stringify({ channel, text, blocks });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "slack.com",
        path: "/api/chat.postMessage",
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(body),
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.ok) console.error(`[slack-reporter] Slack error: ${parsed.error}`);
          } catch {
            // ignore parse errors on Slack response
          }
          resolve();
        });
      }
    );
    req.on("error", (e) => {
      console.error("[slack-reporter] Failed to post to Slack:", e.message);
      resolve(); // don't reject — never fail the test run due to Slack issues
    });
    req.write(body);
    req.end();
  });
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Reporter class ─────────────────────────────────────────────────────────────
class SlackReporter implements Reporter {
  private passed  = 0;
  private failed  = 0;
  private skipped = 0;
  private startMs = Date.now();
  private failedTests: string[] = [];

  onBegin(_config: FullConfig, suite: Suite): void {
    this.startMs = Date.now();
    const total = suite.allTests().length;
    console.log(`\n[slack-reporter] Run starting — ${total} tests → #qa-automation`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === "passed")  this.passed++;
    else if (result.status === "skipped") this.skipped++;
    else {
      this.failed++;
      this.failedTests.push(test.titlePath().slice(1).join(" › "));
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    const total    = this.passed + this.failed + this.skipped;
    const duration = formatDuration(Date.now() - this.startMs);
    const runUrl   = process.env.GITHUB_RUN_URL ||
                     `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` ||
                     "https://github.com";

    const triggeredBy = process.env.SLACK_TRIGGERED_BY || "automation";
    const ok = this.failed === 0 && result.status !== "failed";

    const summaryText = ok
      ? `✅ All ${total} Pallet POS tests passed in ${duration}`
      : `❌ ${this.failed}/${total} Pallet POS tests failed — ${duration}`;

    const blocks: object[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ok
            ? `✅ *Pallet POS — All ${total} tests passed!*`
            : `❌ *Pallet POS — ${this.failed}/${total} tests failed*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Passed:*\n${this.passed}` },
          { type: "mrkdwn", text: `*Failed:*\n${this.failed}` },
          { type: "mrkdwn", text: `*Skipped:*\n${this.skipped}` },
          { type: "mrkdwn", text: `*Duration:*\n${duration}` },
        ],
      },
    ];

    // List failing test names (up to 10)
    if (this.failedTests.length > 0) {
      const shown = this.failedTests.slice(0, 10);
      const extra = this.failedTests.length - shown.length;
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Failed tests:*\n" +
            shown.map((t) => `• ${t}`).join("\n") +
            (extra > 0 ? `\n_…and ${extra} more_` : ""),
        },
      });
    }

    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Report" },
          url: runUrl,
          action_id: "view_report",
        },
      ],
    });

    if (triggeredBy !== "automation") {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `Triggered by <@${triggeredBy}>` }],
      });
    }

    await postToSlack(QA_CHANNEL, summaryText, blocks);
    console.log(`[slack-reporter] Results posted to ${QA_CHANNEL}`);
  }

  printsToStdio(): boolean {
    return false; // don't suppress other reporters
  }
}

export default SlackReporter;
