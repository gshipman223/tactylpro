# Bolt on Gitpod (Server‑Side Replit/Bolt Style)

Spin up a Bolt/Replit‑style environment that uses **Gitpod workspaces** (server‑side) instead of browser WebContainers. Your LLM converts chat prompts into **actions** (create/edit files, run commands), starts a dev server, and returns a **preview URL**.

## Quick Start (Gitpod Cloud — easiest)

1. Create a new GitHub repo and copy these files in.
2. Open it with Gitpod: `https://gitpod.io/#https://github.com/<you>/<repo>`
3. In Gitpod → **Settings → Variables**, add one of:
   - `OPENAI_API_KEY` (optional `OPENAI_MODEL`, e.g. `gpt-4o-mini`)
   - or `ANTHROPIC_API_KEY` (optional `ANTHROPIC_MODEL`, e.g. `claude-3-5-sonnet`)
4. Wait for the workspace to boot. It starts:
   - Agent (port **3030**)
   - App dev server (port **5173** preview auto‑opens)
5. POST to the agent from your chat UI:
   ```bash
   curl -s -X POST $(gp url 3030)/chat \

     -H 'content-type: application/json' \

     -d '{"prompt":"Create a React app that says Hello."}'
   ```
6. Open the Vite preview (Gitpod auto‑opens or run `gp url 5173`).

> No LLM keys? The agent uses a **fallback plan** that scaffolds a React/Vite app and runs it.

## Self‑Hosted (Gitpod Runner on your own Debian)

- Finish the kernel/sysctl steps and connect the Runner to your Gitpod org.
- Create a workspace for this repo targeting your Runner.
- Everything else works the same as Cloud.

## How it “feels like Bolt/Replit”

- **Actions schema** (in `agent/src/actions.ts`) lets the LLM do what Bolt’s WebContainer layer did:
  - `writeFiles`, `createFile`, `appendFile`, `mkdir`, `removePath`, `renamePath`
  - `runCommand` / `runCommands` for installs/builds/dev
  - `gpUrl` returns Gitpod’s public URL for a given port

- **Provider‑agnostic LLM** (in `agent/src/llm.ts`): choose OpenAI or Anthropic (or fallback).

- **Preview** opens automatically on port **5173**, just like Bolt’s dev server panel.

## Wiring your UI (Bolt‑style)

Where your UI previously called WebContainer, call the agent instead:

```ts
async function runPrompt(prompt: string) {
  const base = await (await fetch('/.ports/agent')).text().catch(() => '');
  const url = base || '/chat'; // if you proxy 3030 to same origin
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const j = await r.json();
  const preview = j.outputs?.find((o:any) => o.action === 'gpUrl')?.out?.url;
  return { preview, outputs: j.outputs };
}
```

Or simply call `POST $(gp url 3030)/chat` during testing.

## Security

- Add an auth check (e.g., bearer token) in `server.ts` if exposing `/chat` publicly.
- Store API keys in Gitpod **Variables** (not in the repo).

## Notes

- This repo intentionally keeps the UI minimal so you can drop it into your existing Bolt UI.
- If your prompts are long or the model sends non‑JSON, tighten the system prompt in `llm.ts` or use a JSON‑mode model.
