import "dotenv/config";
import express from "express";
import { z } from "zod";
import { Action, handleAction } from "./actions.js";
import { planActionsFromPrompt } from "./llm.js";

const app = express();
app.use(express.json({ limit: "15mb" }));

app.post("/chat", async (req, res) => {
  try {
    const { prompt } = z.object({ prompt: z.string().min(1) }).parse(req.body);
    const result = await planActionsFromPrompt(prompt);
    const outputs = [] as any[];

    for (const raw of (result.actions ?? [])) {
      const a = Action.parse(raw);
      const out = await handleAction(a);
      outputs.push({ action: a.action, out });
    }
    res.json({ ok: true, outputs });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

app.get("/healthz", (_req, res) => res.send("ok"));

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => console.log(`Agent listening on ${PORT}`));
