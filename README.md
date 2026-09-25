# ai-workflows-testing

Org-wide AI testing framework: reusable CI workflows, per-harness agent
wiring, estate-wide specs, and a Claude Code plugin marketplace for the
testing agents.

## What lives here

- `agents/*.yaml` — one wiring file per agent (prompt reference, tools,
  model tier, skills, MCP). Instruction bodies themselves live in
  `dryvist/ai-llm-prompts` (`automation/testing/<agent>.md`), pinned by ref.
- `scripts/render.mjs` — renders each agent's wiring + body into
  `dist/claude/`, `dist/codex/` and `dist/skills/` for the three harnesses
  (Claude Code, Codex, Agy). CI fails if `dist/` drifts from a fresh render.
- `.claude-plugin/marketplace.json` — the `testing-agents` Claude Code
  plugin, built from `dist/claude/agents`.
- `.github/workflows/_ui-specs.yml`, `_ui-live.yml`, `_ui-heal.yml` —
  reusable workflows a target repo calls to run fixture specs, live
  synthetic-login specs, and the failure healer.
- `specs/` — estate-wide specs that belong to no single app.

## Agents

| Agent | Job | Model | Delivery |
| --- | --- | --- | --- |
| `ui-smoke` | runs specs against fixture or live, reads screenshots | haiku | plugin |
| `spec-author` | plans and generates specs | sonnet | plugin |
| `healer` | separates a real regression from a stale selector | sonnet | plugin |
| `perf-debug` | Chrome DevTools MCP performance traces | sonnet | local only (plugin agents ignore `mcpServers`) |
| `explorer` | exploratory, non-gating Browser Use runs | sonnet | plugin |

## Rendering locally

```sh
bun install
bun run render --prompts-dir <checkout of dryvist/ai-llm-prompts>
git diff --exit-code dist/   # same check CI's render-drift job runs
```

## Using the reusable workflows

```yaml
jobs:
  ui-specs:
    uses: dryvist/ai-workflows-testing/.github/workflows/_ui-specs.yml@main
```

See `.github/workflows/_ui-specs.yml`, `_ui-live.yml` and `_ui-heal.yml` for
every input.
