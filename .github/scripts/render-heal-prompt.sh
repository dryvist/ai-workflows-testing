#!/usr/bin/env bash
# Renders the healer's task prompt: the rendered healer agent body (from
# dist/, already built by the render-drift-checked renderer) plus the
# failure context the caller passed in. Mirrors ai-workflows'
# render-prompt.sh output shape (a single GITHUB_OUTPUT multiline block)
# so the calling step reads it the same way.
set -euo pipefail

body_file=".testing-agents/dist/claude/agents/healer.md"
[ -f "$body_file" ] || { echo "::error::$body_file not found — render-drift should have caught this" >&2; exit 1; }
[ -n "${FAILURE_CONTEXT:-}" ] || { echo "::error::FAILURE_CONTEXT is required" >&2; exit 1; }

delimiter="PROMPT_$(openssl rand -hex 8)"
{
  echo "content<<${delimiter}"
  # Strip the agent's own YAML frontmatter (name/description/tools/model) —
  # the healer needs its instructions, not its own subagent definition.
  awk 'BEGIN{n=0} /^---$/{n++; next} n>=2{print}' "$body_file"
  echo
  echo "## Failure context"
  echo "$FAILURE_CONTEXT"
  echo "${delimiter}"
} >> "$GITHUB_OUTPUT"
