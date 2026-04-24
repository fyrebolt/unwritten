import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/", (c) =>
  c.json({
    name: "unwritten-api",
    status: "ok",
    note: "Temporary scaffold. Real routes land later.",
  }),
);

app.get("/health", (c) =>
  c.json({ status: "ok", ts: new Date().toISOString() }),
);

// Intake / denial / generate — placeholders for the eventual flows.
const intake = new Hono();
intake.post("/", (c) =>
  c.json({ ok: false, reason: "not-implemented" }, 501),
);
app.route("/v1/intake", intake);

const denial = new Hono();
denial.post("/parse", (c) =>
  c.json({ ok: false, reason: "not-implemented" }, 501),
);
app.route("/v1/denial", denial);

const appeal = new Hono();
appeal.post("/generate", (c) =>
  c.json({ ok: false, reason: "not-implemented" }, 501),
);
app.route("/v1/appeal", appeal);

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[unwritten-api] listening on http://localhost:${info.port}`);
});

export default app;
