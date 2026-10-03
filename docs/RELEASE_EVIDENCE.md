# Release evidence

## 2026-10-03 authorized hosted setup

The user approved the prepared baseline/publication/testing scope. Jev retried the full plan in two batches covering 15,825 characters with six evidence files: jev-1.13.0, 14,323 input / 320 output tokens, pause_for_user_decision. After explicit approval, the bounded execution preflight returned ready with an advisory revise_plan_before_changes gate: jev-1.13.0, 4,267 input / 156 output tokens. No code/diff approval is claimed. The connector created the README-only main baseline b877db5a8a1f38eb717bb5418a7433ceba894cf8 and the implementation feature branch. Hosted runs, artifacts, fork and human evidence remain pending. Historical pending-approval statements below describe the earlier state.

Recorded 2026-10-02. The full objective remains active: local implementation is verified, but hosted and human evidence is incomplete. This is not V1 release approval.

| Requirement | Observed evidence |
| --- | --- |
| Tooling/runtime/lockfile | Node 24.12.0; pinned npm lockfile; MIT project license |
| Strict static checks | npm run lint and npm run typecheck passed |
| Schema, Git semantics, parsers and bounds | npm test: 30/30 passed; real histories cover merge-base/direct mode, deletion/rename/cycles, current base-tip CODEOWNERS, shallow history, symlinks, bytes/depth/files, encoding, hostile content |
| JS/TS + Python local slice | Both adapters pass fixtures and isolated shipped-bundle smoke |
| Python parser feasibility | scripts/python-spike.mjs loads pinned web-tree-sitter 0.20.8 and packaged Python WASM offline; licenses and binary digests retained |
| Offline viewer | Chrome through development-only Playwright; file:// demo loads without network assets or console errors |
| Keyboard and responsive behavior | Search, role/owner filters, keyboard selection/detail focus; 1280x900 and 320x800; no viewport overflow; screenshots visually inspected |
| Trusted distributables | npm run test:package passed from an isolated temp directory where TypeScript/node_modules were unavailable; CLI and Action loaded Python WASM and emitted exact-SHA graph/summary/outputs |
| Reproducible build | scripts/check-build.mjs found all six dist/schema artifacts byte-identical after rebuild; hashes in BUILD_EVIDENCE.json |
| Runtime dependency audit | npm audit --omit=dev: zero known vulnerabilities at check time; not a safety guarantee |
| Bounded performance | BENCHMARK.json: 1,000 files per revision, 1,096 ms on recorded Windows/i3 machine, RSS after 186,949,632 bytes; depth 20 produced 21 candidates and explicit depth warnings, not exhaustive impact |
| Static documentation/demo | docs/index.html and docs/demo/index.html built locally; demo is synthetic and its example source SHAs are not reachable public commits |
| Actual public same-repo PR run/artifact | Missing: connector reports no branches; main-baseline and feature publication approval pending |
| Actual public fork PR run/artifact | Missing: exposed connector has no fork-creation tool; forks enumeration returned HTTP 400 unsupported endpoint; need an existing authorized fork via supported operations |
| Maintainer installation trial | Missing; local package/browser checks are not a human installation trial |
| Three maintainer adoption trials | Missing; adoption validation is separate from technical readiness, and no outreach was authorized |
| Published demo/registry/Marketplace/main merge | Not authorized or performed |

## Jev coverage and limits

The implementation plan preflight and bounded source-evidence reviews completed normally with typed answers, resolved model jev-1.13.0 and non-empty usage. Earlier selected-source checkpoints included:

- GitReader, scan adapters, impact enrichment, CODEOWNERS, core and advanced regression tests: 12,210 input / 158 output tokens; advisory revise_plan with pause_for_user_decision.
- Schema, renderer, trusted Action wrapper, build, browser checker and CI: 8,077 input / 158 output tokens; advisory revise_plan with pause_for_user_decision.

An earlier source-evidence review also included the CLI, action metadata and consumer workflow. Source-evidence calls use the plan tool; their code_review field is null. They are not full code/diff approval. No concrete textual finding was returned; deterministic verification and explicit remaining evidence gates govern progress under the current advisory policy.

The complete-diff request excluded only the pre-existing docs/IMPLEMENTATION_PLAN.md. It failed before transmission because dist/action.cjs exceeds the helper's 2 MiB untracked-file limit. The tool explicitly said no partial diff was sent. No complete-diff model/usage receipt or generated-bundle review is claimed. Binary WASM and generated bundles remain outside the bounded source-evidence review coverage. The helper controls were not bypassed.

## Remaining gates

Approve the prepared minimal main baseline and feature publication before hosted setup; retain the implementation on its feature branch and never merge main without separate approval. Supply an authorized existing fork through a supported connector route for real fork verification. Record actual run, exact SHA, artifact and offline-view evidence. Obtain real installation/adoption feedback without inventing it. Keep the full goal active until its required evidence exists.

## Continuation audit corrections

The continuation audit fixed custom Python source-root ambiguity, module/package uncertainty, emitted JS/JSX/declaration resolution, exact/longest-prefix aliases, directory-package uncertainty, CLI argument/ceiling exit codes, and named CLI entry bootstrapping. New tests cover zero changes and unrelated histories; the browser checker also asserts graph filtering. See COMPLETION_AUDIT.md for the milestone-by-milestone assessment.

Current local evidence: 30/30 tests, lint/typecheck, build, isolated named-CLI/Action JS/Python smoke, byte-identical dist/schema rebuild and offline desktop/mobile/docs browser checks pass. The latest bounded post-change source-evidence call selected six files (scan, CLI, executable entry, resolution tests, build, package smoke), resolved jev-1.13.0 and returned advisory revise_plan/pause_for_user_decision with 7,261 input / 158 output tokens. Its code_review is null; no full-diff or approval claim is made. Main/publish approval and a supported authorized fork remain pending.
