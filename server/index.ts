import express from "express";
import dotenv from "dotenv";
import { slackRouter } from "./routes/slack";
import { healthRouter } from "./routes/health";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Raw-body capture needed for Slack HMAC signature verification
const rawBodyCapture = (req: any, _res: express.Response, buf: Buffer) => {
  req.rawBody = buf;
};

app.use(express.json({ verify: rawBodyCapture }));
app.use(express.urlencoded({ extended: true, verify: rawBodyCapture }));

app.use("/slack", slackRouter);
app.use("/health", healthRouter);

app.listen(PORT, () => {
  console.log(`🎭 Pallet POS Slack bridge running on http://localhost:${PORT}`);
  console.log(`   Slack commands  → POST /slack/commands`);
  console.log(`   Test results    → POST /slack/results`);
  console.log(`   Health check    → GET  /health`);
});

export default app;
