import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  stripFrontmatter,
  loadAgents,
  renderAll,
} from "../scripts/render.mjs";

const AGENTS_DIR = join(import.meta.dir, "..", "agents");
const PROMPTS_DIR = join(import.meta.dir, "fixtures", "prompts");

let outDir;

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), "render-test-"));
});

afterAll(() => {
  rmSync(outDir, { recursive: true, force: true });
});

describe("stripFrontmatter", () => {
  test("removes a leading --- block", () => {
    expect(stripFrontmatter("---\ntitle: x\n---\nbody\n")).toBe("body\n");
  });

  test("passes through text with no frontmatter", () => {
    expect(stripFrontmatter("body\n")).toBe("body\n");
  });

  test("throws on unterminated frontmatter", () => {
    expect(() => stripFrontmatter("---\ntitle: x\nbody\n")).toThrow();
  });
});

describe("loadAgents", () => {
  test("loads all five wiring files, sorted by name", () => {
    const agents = loadAgents(AGENTS_DIR);
    expect(agents.map((a) => a.name)).toEqual([
      "explorer",
      "healer",
      "perf-debug",
      "spec-author",
      "ui-smoke",
    ]);
  });

  test("perf-debug is the only local agent with an mcp entry", () => {
    const agents = loadAgents(AGENTS_DIR);
    const local = agents.filter((a) => a.local);
    expect(local.map((a) => a.name)).toEqual(["perf-debug"]);
    expect(local[0].mcp).toEqual(["chrome-devtools"]);
  });
});

describe("renderAll", () => {
  let files;

  beforeAll(() => {
    files = renderAll({
      promptsDir: PROMPTS_DIR,
      agentsDir: AGENTS_DIR,
      out: outDir,
    });
  });

  test("writes a claude agent file for every non-local agent", () => {
    for (const name of ["ui-smoke", "spec-author", "healer", "explorer"]) {
      const p = join(outDir, "claude", "agents", `${name}.md`);
      expect(existsSync(p)).toBe(true);
      const content = readFileSync(p, "utf8");
      expect(content).toStartWith("---\n");
      expect(content).toContain(`name: ${name}`);
      expect(content).toContain("fixture body");
    }
  });

  test("perf-debug renders only to claude/local-agents, with mcpServers", () => {
    expect(
      existsSync(join(outDir, "claude", "agents", "perf-debug.md")),
    ).toBe(false);
    const p = join(outDir, "claude", "local-agents", "perf-debug.md");
    expect(existsSync(p)).toBe(true);
    expect(readFileSync(p, "utf8")).toContain("mcpServers:");
  });

  test("writes a codex toml and a skill for every agent", () => {
    for (const name of [
      "ui-smoke",
      "spec-author",
      "healer",
      "perf-debug",
      "explorer",
    ]) {
      expect(
        existsSync(join(outDir, "codex", "agents", `${name}.toml`)),
      ).toBe(true);
      expect(existsSync(join(outDir, "skills", name, "SKILL.md"))).toBe(true);
    }
  });

  test("codex config-snippet lists one [agents.<role>] block per agent", () => {
    const snippet = readFileSync(
      join(outDir, "codex", "config-snippet.toml"),
      "utf8",
    );
    for (const name of [
      "ui-smoke",
      "spec-author",
      "healer",
      "perf-debug",
      "explorer",
    ]) {
      expect(snippet).toContain(`[agents.${name}]`);
      expect(snippet).toContain(`config_file = "./agents/${name}.toml"`);
    }
  });

  test("claude plugin manifest excludes perf-debug", () => {
    const manifest = JSON.parse(
      readFileSync(
        join(outDir, "claude", ".claude-plugin", "plugin.json"),
        "utf8",
      ),
    );
    expect(manifest.agents).toEqual([
      "./agents/explorer.md",
      "./agents/healer.md",
      "./agents/spec-author.md",
      "./agents/ui-smoke.md",
    ]);
  });

  test("returns the same file list on a second render (deterministic)", () => {
    const second = renderAll({
      promptsDir: PROMPTS_DIR,
      agentsDir: AGENTS_DIR,
      out: outDir,
    });
    expect(second.sort()).toEqual(files.sort());
  });
});
