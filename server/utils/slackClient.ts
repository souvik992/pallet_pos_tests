import https from "https";

// Default to the qa-automation channel; override via SLACK_CHANNEL env var
export const QA_CHANNEL = process.env.SLACK_CHANNEL || "#qa-automation";

export async function postSlackMessage(
  channel: string,
  text: string,
  blocks?: object[]
): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");

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
          const parsed = JSON.parse(data);
          if (!parsed.ok) reject(new Error(`Slack API error: ${parsed.error}`));
          else resolve();
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export function buildTriggerBlocks(
  triggeredBy: string,
  suite: string,
  browser: string
): object[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: "🎭 *Pallet POS — Playwright test run triggered!*" },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Suite:*\n${suite}` },
        { type: "mrkdwn", text: `*Browser:*\n${browser}` },
        { type: "mrkdwn", text: `*Triggered by:*\n<@${triggeredBy}>` },
        { type: "mrkdwn", text: `*Status:*\n⏳ Running…` },
      ],
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: "Results will appear here when the run completes." }],
    },
  ];
}

export function buildResultBlocks(
  passed: number,
  failed: number,
  total: number,
  duration: string,
  runUrl: string,
  triggeredBy: string
): object[] {
  const ok = failed === 0;
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ok
          ? `✅ *Pallet POS — All ${total} tests passed!*`
          : `❌ *Pallet POS — ${failed}/${total} tests failed*`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Passed:*\n${passed}` },
        { type: "mrkdwn", text: `*Failed:*\n${failed}` },
        { type: "mrkdwn", text: `*Total:*\n${total}` },
        { type: "mrkdwn", text: `*Duration:*\n${duration}` },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Run" },
          url: runUrl,
          action_id: "view_run",
        },
      ],
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Requested by <@${triggeredBy}>` }],
    },
  ];
}
