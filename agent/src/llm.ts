import { Action } from "./actions.js";

/**
 * Plan actions from user prompt.
 * Provider-agnostic: choose OpenAI or Anthropic via env, else fallback plan.
 *
 * Env:
 *  PROVIDER=openai|anthropic|auto (default auto)
 *  OPENAI_API_KEY / OPENAI_MODEL (e.g., gpt-4o-mini)
 *  ANTHROPIC_API_KEY / ANTHROPIC_MODEL (e.g., claude-3-5-sonnet)
 */
export async function planActionsFromPrompt(prompt: string): Promise<{ actions: unknown[] }> {
  const provider = (process.env.PROVIDER || "auto").toLowerCase();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  if (provider === "openai" || (provider === "auto" && hasOpenAI)) {
    return await planWithOpenAI(prompt);
  }
  if (provider === "anthropic" || (provider === "auto" && hasAnthropic)) {
    return await planWithAnthropic(prompt);
  }
  // Fallback: scaffold a Vite React app and run it
  return fallbackPlan(prompt);
}

function systemInstruction(schema: string) {
  return `You are a code generation agent running INSIDE a Gitpod workspace (server-side).
Your ONLY output must be valid JSON: {"actions":[...]} where each action matches this schema:
${schema}

Guidelines:
- Prefer a single 'runCommands' to install and start dev server, e.g. ["npm create vite@latest . -- --template react", "npm install", "npm run dev"].
- Put new project files under the 'app/' directory unless an absolute path is provided.
- After starting the dev server, return {"action":"gpUrl","port":5173} to expose the preview URL.
- Do not include commentary or markdown, only JSON.`;
}

async function planWithOpenAI(prompt: string) {
  const { OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const schema = Action.toString();
  const sys = systemInstruction(schema);
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const resp = await openai.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: prompt }
    ]
  });
  const text = resp.choices?.[0]?.message?.content || "{}";
  return JSON.parse(text);
}

async function planWithAnthropic(prompt: string) {
  const { Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const schema = Action.toString();
  const sys = systemInstruction(schema);
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20240620";
  const msg = await anthropic.messages.create({
    model,
    temperature: 0,
    max_tokens: 4096,
    system: sys,
    messages: [{ role: "user", content: prompt }]
  });
  const text = (msg.content?.[0] && "text" in msg.content[0]) ? (msg.content[0] as any).text : "{}";
  return JSON.parse(text);
}

function fallbackPlan(prompt: string) {
  return {
    actions: [
      { action: "writeFiles", files: {
        "README.md": `# App\n\nGenerated from prompt:\n\n${prompt}\n`
      }},
      { action: "runCommands", cwd: "app", cmds: [
        "npm create vite@latest . -- --template react",
        "npm install",
        "npm run dev"
      ]},
      { action: "gpUrl", port: 5173 }
    ]
  };
}
