# Docs

Short usage notes. Full architecture and rationale live in the org's private
documentation source, not here — see the root `README.md` for the public
file map.

## Adding a target repo to fixture specs

```yaml
jobs:
  ui-specs:
    uses: dryvist/ai-workflows-testing/.github/workflows/_ui-specs.yml@main
```

Your repo needs its own `package.json` with `@playwright/test`, a Playwright
config, and a `tests/` suite (or set `working_directory`).

## Adding a target repo to live specs

```yaml
jobs:
  ui-live:
    uses: dryvist/ai-workflows-testing/.github/workflows/_ui-live.yml@main
    with:
      target_url: ${{ vars.WALL_URL }}
      openbao_jwt_audience: ${{ vars.OPENBAO_JWT_AUDIENCE }}
      openbao_password_path: secret/data/synthetic/svc-synthetic-ui
      openbao_totp_path: totp/code/svc-synthetic-ui
    secrets:
      OPENBAO_ADDR: ${{ secrets.OPENBAO_ADDR }}
```

Needs a `playwright.live.config.ts` in the caller repo, and the caller's
runner must be a member of the `ui-synthetic` self-hosted runner group.

## Adding the healer on failure

```yaml
jobs:
  ui-heal:
    if: failure()
    needs: [ui-specs]
    uses: dryvist/ai-workflows-testing/.github/workflows/_ui-heal.yml@main
    with:
      failure_context: "ui-specs failed: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
    secrets: inherit
```

## Rendering agent wiring locally

```sh
bun install
bun run render --prompts-dir <ai-llm-prompts checkout>
git diff --exit-code dist/
```
