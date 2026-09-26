# ai-workflows-testing — AI Agent Documentation

Org-wide AI testing framework: agent wiring, a per-harness renderer, reusable
CI workflows, and estate-wide specs. See `README.md` for the file map.

## Version management

Never hardcode dependency versions unless explicitly requested. Renovate
manages `package.json` and pinned action SHAs.

## Editing agent wiring

- Each `agents/<name>.yaml` names its prompt body by `repo` + `path` in
  `dryvist/ai-llm-prompts`, pinned to a ref. `PROMPTS_REF` (repo root) is the
  single ref every wiring file and every workflow checkout uses — change it
  in one place.
- Never hand-edit a `dist/` file. Run `bun run render` and commit the result;
  CI's `render-drift` job fails on any difference.
- `perf-debug` renders to `dist/claude/local-agents/`, not
  `dist/claude/agents/`, and is excluded from the `testing-agents` plugin —
  plugin agents ignore `mcpServers`, so it ships only as a local Claude agent
  (delivered by `nix-ai`) and as a Codex/Agy agent.

## Workflow conventions

- Reusable workflows only call other reusables by pinned ref
  (`dryvist/.github/.github/workflows/_*.yml@main`) or a pinned action SHA —
  never an unpinned tag.
- No inline `run: |` logic beyond one command invoking a tested script file.
- `_ui-live.yml` runs only on `schedule`, `workflow_dispatch` and `release` —
  never `pull_request` — and targets the `uicheck` self-hosted runner
  group. It reads credentials from OpenBao by path; no secret value is ever
  hardcoded or logged.
- No hostnames or IPs in this repo. Callers pass the target URL and catalog
  source as workflow inputs/env.

## Development

```sh
bun install
bun test              # unit tests, including the render golden test
bun run render --prompts-dir <ai-llm-prompts checkout>
git diff --exit-code dist/
```

Lint before committing: `nix run nixpkgs#actionlint`, `nix run nixpkgs#zizmor -- .github/workflows`.

## PR review checklist

- [ ] No exposed secrets or credentials.
- [ ] `dist/` matches a fresh `bun run render` (render-drift is clean).
- [ ] `actionlint` and `zizmor` pass.
- [ ] Conventional commit message.
