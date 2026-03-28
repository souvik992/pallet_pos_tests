import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

export function verifySlackSignature(
  req: Request & { rawBody?: Buffer },
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) {
    res.status(500).json({ error: "SLACK_SIGNING_SECRET not set" });
    return;
  }

  const timestamp = req.headers["x-slack-request-timestamp"] as string;
  const slackSig = req.headers["x-slack-signature"] as string;

  if (!timestamp || !slackSig) {
    res.status(400).json({ error: "Missing Slack headers" });
    return;
  }

  // Reject requests older than 5 minutes (replay-attack prevention)
  if (Math.floor(Date.now() / 1000) - parseInt(timestamp, 10) > 300) {
    res.status(400).json({ error: "Request too old" });
    return;
  }

  const rawBody = req.rawBody?.toString() ?? "";
  const computed =
    "v0=" +
    crypto
      .createHmac("sha256", secret)
      .update(`v0:${timestamp}:${rawBody}`, "utf8")
      .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(slackSig))) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  next();
}
