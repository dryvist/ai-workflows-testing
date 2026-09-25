#!/usr/bin/env node
// Renders each agents/<name>.yaml wiring file, plus its instruction body
// (checked out separately from dryvist/ai-llm-prompts, see PROMPTS_REF),
// into per-harness outputs under dist/. CI's render-drift job re-runs this
// and fails on any diff — see .github/workflows/tests.yml.
//
// Usage: render.mjs --prompts-dir <checkout root> [--agents-dir agents] [--out dist]
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { parse as parseYaml } from "yaml";

function parseArgs(argv) {
  const out = { agentsDir: "agents", out: "dist" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--prompts-dir") out.promptsDir = argv[++i];
    else if (a === "--agents-dir") out.agentsDir = argv[++i];
    else if (a === "--out") out.out = argv[++i];
  }
  if (!out.promptsDir) throw new Error("--prompts-dir is required");
  return out;
}

// Mirrors .github/scripts/render-prompt.sh's frontmatter strip (ai-workflows).
export function stripFrontmatter(text) {
  const lines = text.split("\n");
  if (lines[0] !== "---") return text;
  const end = lines.indexOf("---", 1);
  if (end === -1) throw new Error("unterminated frontmatter");
  return lines.slice(end + 1).join("\n").replace(/^\n+/, "");
}

export function loadAgents(agentsDir) {
  return readdirSync(agentsDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => {
      const doc = parseYaml(readFileSync(join(agentsDir, f), "utf8"));
      if (!doc.name) throw new Error(`${f}: missing name`);
      return doc;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function readBody(promptsDir, agent) {
  const text = readFileSync(join(promptsDir, agent.prompt.path), "utf8");
  return stripFrontmatter(text).trimEnd() + "\n";
}

// Claude subagent markdown: YAML frontmatter (name, description, tools,
// model) + the rendered body. mcpServers is omitted even when the wiring
// lists mcp entries for a plugin-delivered agent — Claude plugin agents
// ignore it (S2 finding); only a local agent (perf-debug) gets it.
export function renderClaude(agent, body) {
  const fm = [
    "---",
    `name: ${agent.name}`,
    `description: ${agent.description}`,
    `tools: ${(agent.tools || []).join(", ")}`,
    `model: ${agent.model}`,
  ];
  if (agent.local && agent.mcp?.length) {
    fm.push("mcpServers:");
    for (const m of agent.mcp) fm.push(`  ${m}: {}`);
  }
  fm.push("---", "");
  return fm.join("\n") + body;
}

function tomlString(s) {
  return `"""\n${s.replace(/"""/g, '\\"\\"\\"')}"""`;
}

// Codex role TOML, per developers.openai.com/codex/config-reference: a role
// file reuses the main config.toml schema. Best-effort minimal set (model,
// reasoning effort, an mcp_servers table when the agent needs one, and the
// rendered body as `instructions`) — confirm the `instructions` field name
// against a live `codex` run before nix-ai wires this (Step 4).
export function renderCodexToml(agent, body) {
  const lines = [`model = "${agent.model}"`];
  if (agent.model === "sonnet" || agent.model === "haiku") {
    // router role alias, not a vendor id — matches run-ai-agent's convention.
  }
  lines.push(`model_reasoning_effort = "medium"`);
  if (!agent.local) {
    // Non-local agents run inside the shared testing-agents surface; no
    // per-role sandbox override needed today.
  }
  for (const m of agent.mcp || []) {
    lines.push("", `[mcp_servers.${m}]`, `command = "${m}"`);
  }
  lines.push("", `instructions = ${tomlString(body)}`);
  return lines.join("\n") + "\n";
}

export function renderConfigSnippet(agents) {
  const lines = [
    "# Merge these into ~/.codex/config.toml (nix-ai owns the actual write).",
  ];
  for (const a of agents) {
    lines.push(
      "",
      `[agents.${a.name}]`,
      `description = "${a.description}"`,
      `config_file = "./agents/${a.name}.toml"`,
    );
  }
  return lines.join("\n") + "\n";
}

export function renderSkill(agent, body) {
  const fm = [
    "---",
    `name: ${agent.name}`,
    `description: ${agent.description}`,
    "---",
    "",
  ];
  return fm.join("\n") + body;
}

export function renderClaudePluginManifest(agents) {
  return (
    JSON.stringify(
      {
        name: "testing-agents",
        version: "0.1.0",
        description: "UI testing agents: ui-smoke, spec-author, healer, explorer.",
        agents: agents
          .filter((a) => !a.local)
          .map((a) => `./agents/${a.name}.md`),
      },
      null,
      2,
    ) + "\n"
  );
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export function renderAll({ promptsDir, agentsDir, out }) {
  const agents = loadAgents(agentsDir);
  const written = [];
  for (const agent of agents) {
    const body = readBody(promptsDir, agent);

    const claudeDir = agent.local ? "local-agents" : "agents";
    const claudePath = join(out, "claude", claudeDir, `${agent.name}.md`);
    write(claudePath, renderClaude(agent, body));
    written.push(claudePath);

    const codexPath = join(out, "codex", "agents", `${agent.name}.toml`);
    write(codexPath, renderCodexToml(agent, body));
    written.push(codexPath);

    const skillPath = join(out, "skills", agent.name, "SKILL.md");
    write(skillPath, renderSkill(agent, body));
    written.push(skillPath);
  }

  const snippetPath = join(out, "codex", "config-snippet.toml");
  write(snippetPath, renderConfigSnippet(agents));
  written.push(snippetPath);

  const pluginPath = join(out, "claude", ".claude-plugin", "plugin.json");
  write(pluginPath, renderClaudePluginManifest(agents));
  written.push(pluginPath);

  return written;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  const files = renderAll(opts);
  for (const f of files) console.log(f);
}
