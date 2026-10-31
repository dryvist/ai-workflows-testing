---
type: Acceptance Specification
title: Specialist acceptance suite
description: Fixture-only native request and response checks plus the candidate evaluation matrix.
timestamp: 2026-10-31T20:38:22Z
---

The fixture suite prepares native HTTP contract checks for Sim, Langflow, Dify,
and the Hermes baseline. Playwright intercepts each `.invalid` origin in-process
and supplies saved response fixtures. The browser context runs offline and
blocks service workers. Passing a fixture test proves only that its
request/response and identity assertions work; it does not prove candidate
behavior.

## Run the fixture suite

Use the repo's locked dependencies and a local Playwright Chromium install:

```sh
bun install --frozen-lockfile
bun test
bun run typecheck
bunx playwright install chromium
bun run test:acceptance
```

`test:acceptance` selects only `specs/specialist-acceptance/`. It does not run
the estate SSO smoke or contact a candidate. Repo CI runs these fixtures on
pull requests without candidate URLs, credentials, or model calls.

The specs preserve each native request and response shape separately. They
assert identifiers documented by each response and use them in native
status/readback requests only where the contract provides those requests. The
Langflow `/v1/run` sample provides a session ID and nested output, not a run ID.
The specs do not provide a shared client or translate candidate APIs into a
production protocol.

## Status meanings

| Status | Meaning |
| --- | --- |
| `PASS` | The named fixture assertion passed, or a candidate requirement passed with observed native evidence. Fixture `PASS` is harness-only. |
| `FAIL` | A required fixture assertion failed, or an observed candidate requirement failed. |
| `BLOCKED` | A planned stage cannot start because a required target or safe configuration is unavailable. |
| `NOT_RUN` | No candidate execution or candidate proof was performed. |

When a required isolated target is unavailable, stage readiness is `BLOCKED`;
candidate outcome remains `NOT_RUN` until a candidate run occurs. Fixture tests
use saved response data and do not alter either status.

## Sixteen-row matrix

Candidate outcomes for Sim, Langflow, Dify, and Hermes remain `NOT_RUN` in
fixture mode. Fixture status records only B2 assertion coverage.

| Row | Candidate proof required | B2 fixture status | Candidate outcome |
| --- | --- | --- | --- |
| Authoring | Native create/export; record action count | `NOT_RUN` | `NOT_RUN` |
| Fleet maintenance | Propagate approved update; inspect edits and stale references | `NOT_RUN` | `NOT_RUN` |
| Expertise | Import/export instructions, reference, and asset; verify retrieval/use | `NOT_RUN` | `NOT_RUN` |
| Discovery and calling | Caller discovery and task result correlated to its documented native identity | `PASS` — request/response fixtures only | `NOT_RUN` |
| Lifecycle | Native submit/status/result readback; continuation and cancellation | `PASS` — terminal status/readback fixtures only | `NOT_RUN` |
| Slack | Mention trigger, same-thread reply, and task correlation | `NOT_RUN` | `NOT_RUN` |
| Scheduling | Isolated restart; one run or documented coalescing/misfire | `NOT_RUN` | `NOT_RUN` |
| Queue | Durable acceptance through restart or retryable failure preserving receipt | `NOT_RUN` | `NOT_RUN` |
| Worker failure | Kill worker; observe recovery and traceable explicit retry | `NOT_RUN` | `NOT_RUN` |
| Ambiguous write | Accepted write loses reply; readback verifies one logical effect | `NOT_RUN` | `NOT_RUN` |
| Authority | Reject bad repo/args/grant/replay/caller; check known fixture markers | `PASS` — marker assertion only | `NOT_RUN` |
| Read-only role | Read passes; actual boundary rejects write without mutation | `NOT_RUN` | `NOT_RUN` |
| Local models | Deterministic action/result route with no cloud fallback | `NOT_RUN` | `NOT_RUN` |
| Economics and edition | Free edition path; record build/license and activation dependency | `NOT_RUN` | `NOT_RUN` |
| Portability | Restore config/references/assets/state; rerun specialist | `NOT_RUN` | `NOT_RUN` |
| Fresh session | Fresh caller with directory/policy; verify delegation and fixture routing | `NOT_RUN` | `NOT_RUN` |

| Candidate | Outcome for every matrix row |
| --- | --- |
| Sim | `NOT_RUN` |
| Langflow | `NOT_RUN` |
| Dify | `NOT_RUN` |
| Hermes baseline | `NOT_RUN` |

## Native fixture sources

The response fixtures mirror documented shapes with fixture-only values. These
references are for fixture shapes; no live candidate build has been selected
or verified. Confirm each contract against the exact build before evaluation.

| Candidate | Native request and response reference | Fixture reference build |
| --- | --- | --- |
| Sim | [API docs][sim-docs] | [v0.9.36 release][sim-release] |
| Langflow | [1.13.0 API][langflow-docs], [flow trigger][langflow-trigger] | [v1.13.0 release][langflow-release] |
| Dify | [Run Workflow][dify-run], [Get Workflow Run Detail][dify-detail] | [v1.18.0 release][dify-release] |
| Hermes baseline | [A2A plugin][hermes-plugin], [A2A protocol][a2a-docs] | [v0.22.5 release][hermes-release] |

[sim-docs]: https://docs.sim.ai/workflows/deployment/api
[sim-release]: https://github.com/simstudioai/sim/releases/tag/v0.9.36
[langflow-docs]: https://docs.langflow.org/api
[langflow-trigger]: https://docs.langflow.org/api-flows-run
[langflow-release]: https://github.com/langflow-ai/langflow/releases/tag/1.13.0
[dify-run]: https://docs.dify.ai/en/api-reference/workflow-runs/run-workflow
[dify-detail]: https://docs.dify.ai/en/api-reference/workflow-runs/get-workflow-run-detail
[dify-release]: https://github.com/langgenius/dify/releases/tag/1.18.0
[hermes-plugin]: https://github.com/NousResearch/hermes-agent/tree/v0.22.5/plugins/platforms/a2a
[a2a-docs]: https://a2a-protocol.org/latest/specification/
[hermes-release]: https://github.com/NousResearch/hermes-agent/releases/tag/v0.22.5

## Candidate evidence boundary

For evaluation, pin the candidate build and use its documented native request
and lifecycle. Record the caller, native run/attempt IDs, timestamps, observed
assertions, actual outcome, and a pointer to the approved private receipt. Keep
target URLs, credentials, screenshots, and operational details out of public
artifacts. Do not promote a fixture pass, rendered config, or tool listing to
candidate `PASS`.

The response fixtures use placeholder IDs and `.invalid` URLs. They are
documentation-shaped test data, not live receipts, and provide no queue,
scheduler, worker-failure, ambiguous-write, isolation, model, edition, or
deployment coverage. The Authority fixture assertion checks only explicit
marker strings in fixture log lines. It does not claim general detection or
prove a live logging boundary. Environment-dependent proofs remain `NOT_RUN`
until their isolated targets and authority are available.
