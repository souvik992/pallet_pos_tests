import { Router, Request, Response } from "express";
import { verifySlackSignature } from "../utils/verifySlackSignature";
import { triggerGitHubActions } from "../utils/triggerGitHubActions";
import {
  QA_CHANNEL,
  postSlackMessage,
  buildTriggerBlocks,
  buildResultBlocks,
} from "../utils/slackClient";

export const slackRouter = Router();

/**
 * POST /slack/commands
 *
 * Receives the /playwright slash command from Slack.
 * Usage:
 *   /playwright               → all tests, chromium
 *   /playwright smoke         → smoke suite, chromium
 *   /playwright sanity firefox
 */
slackRouter.post(
  "/commands",
  verifySlackSignature,
  async (req: Request, res: Response) => {
    const { text, user_id } = req.body as {
      text: string;
      channel_id: string;
      user_id: string;
    };

    // Acknowledge immediately — Slack requires a response within 3 s
    res.status(200).json({
      response_type: "ephemeral",
      text: `⏳ Triggering Pallet POS tests… results will appear in <#${QA_CHANNEL}>.`,
    });

    const args    = (text ?? "").trim().split(/\s+/).filter(Boolean);
    const suite   = args[0] ?? "all";
    const browser = args[1] ?? "chromium";

    try {
      await triggerGitHubActions({
        suite,
        browser,
        slackChannel: QA_CHANNEL,
        triggeredBy: user_id,
      });

      await postSlackMessage(
        QA_CHANNEL,
        `🎭 Pallet POS Playwright test run started by <@${user_id}>`,
        buildTriggerBlocks(user_id, suite, browser)
      );
    } catch (err) {
      await postSlackMessage(
        QA_CHANNEL,
        `❌ <@${user_id}> Failed to trigger tests: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
);

/**
 * POST /slack/results
 *
 * Called by GitHub Actions (or by the Slack reporter locally) after a run.
 * Body: { triggered_by, passed, failed, total, duration, run_url }
 * Auth: Authorization: Bearer <RESULTS_WEBHOOK_SECRET>
 */
slackRouter.post("/results", async (req: Request, res: Response) => {
  const secret = process.env.RESULTS_WEBHOOK_SECRET;
  if (secret && req.headers["authorization"] !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { triggered_by, passed, failed, total, duration, run_url } = req.body as {
    triggered_by: string;
    passed: number;
    failed: number;
    total: number;
    duration: string;
    run_url: string;
  };

  try {
    const summary =
      failed === 0
        ? `✅ All ${total} Pallet POS tests passed in ${duration}`
        : `❌ ${failed}/${total} Pallet POS tests failed — ${duration}`;

    await postSlackMessage(
      QA_CHANNEL,
      summary,
      buildResultBlocks(passed, failed, total, duration, run_url, triggered_by)
    );

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
