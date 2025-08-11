// Action execution engine for Gitpod workspaces (server-side)
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { execa } from "execa";

export const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("writeFiles"), files: z.record(z.string()) }),
  z.object({ action: z.literal("createFile"), path: z.string(), content: z.string() }),
  z.object({ action: z.literal("appendFile"), path: z.string(), content: z.string() }),
  z.object({ action: z.literal("readFile"), path: z.string() }),
  z.object({ action: z.literal("mkdir"), path: z.string() }),
  z.object({ action: z.literal("removePath"), path: z.string() }),
  z.object({ action: z.literal("renamePath"), from: z.string(), to: z.string() }),
  z.object({ action: z.literal("runCommand"), cmd: z.string(), cwd: z.string().default("app") }),
  z.object({ action: z.literal("runCommands"), cmds: z.array(z.string()), cwd: z.string().default("app") }),
  z.object({ action: z.literal("gpUrl"), port: z.number() })
]);
export type Action = z.infer<typeof Action>;

function absPath(p: string) {
  return path.resolve("/", p.startsWith("/") ? p : path.join("app", p));
}

export async function handleAction(a: Action) {
  switch (a.action) {
    case "writeFiles": {
      for (const [rel, content] of Object.entries(a.files)) {
        const abs = absPath(rel);
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, content, "utf8");
      }
      return { ok: true };
    }
    case "createFile": {
      const abs = absPath(a.path);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, a.content, "utf8");
      return { ok: true };
    }
    case "appendFile": {
      const abs = absPath(a.path);
      await fs.appendFile(abs, a.content, "utf8");
      return { ok: true };
    }
    case "readFile": {
      const abs = absPath(a.path);
      const content = await fs.readFile(abs, "utf8");
      return { ok: true, content };
    }
    case "mkdir": {
      const abs = absPath(a.path);
      await fs.mkdir(abs, { recursive: true });
      return { ok: true };
    }
    case "removePath": {
      const abs = absPath(a.path);
      await fs.rm(abs, { recursive: true, force: true });
      return { ok: true };
    }
    case "renamePath": {
      const from = absPath(a.from);
      const to = absPath(a.to);
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.rename(from, to);
      return { ok: true };
    }
    case "runCommand": {
      const res = await execa("bash", ["-lc", a.cmd], { cwd: path.resolve("/", a.cwd) });
      return { ok: true, stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode };
    }
    case "runCommands": {
      const outputs: any[] = [];
      for (const cmd of a.cmds) {
        const res = await execa("bash", ["-lc", cmd], { cwd: path.resolve("/", a.cwd) });
        outputs.push({ cmd, stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode });
      }
      return { ok: true, results: outputs };
    }
    case "gpUrl": {
      const { stdout } = await execa("bash", ["-lc", `gp url ${a.port}`]);
      return { ok: true, url: stdout.trim() };
    }
  }
}
