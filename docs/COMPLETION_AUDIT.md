# Historical completion audit against IMPLEMENTATION_PLAN.md

**Historical audit snapshot, updated through 2026-10-03.** The earlier same-repository evidence is recorded in [HOSTED_EVIDENCE.md](HOSTED_EVIDENCE.md). This table predates the current local `codex/ui-impact-explorer` changes and is not the current release status; use [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md) for the authoritative 2026-10-04 candidate checklist.

Current update2026-10-03: user approved hosted setup; implementation CI and real same-repository JS/Python Action artifact checks now pass, including downloaded offline mobile/exact-link verification. See HOSTED_EVIDENCE.md for immutable revisions, run/artifact identities and corrected failures. Fork verification and human installation/adoption remain missing. The milestone table and pending-approval narrative below preserve the earlier local audit snapshot and are superseded for same-repository hosted evidence and approval status.

Current objective: **implement this plan now, must be done FULLY**. The objective is not complete. This audit separates implementation evidence from hosted/human requirements; it does not redefine V1 as a local-only product.

| Milestone | Required proof | Current authoritative evidence | Assessment |
| --- | --- | --- | --- |
| A0 Bootstrap and feasibility | Node tooling, locked dependencies, license and distributable offline Python parser | package.json/package-lock.json/LICENSE; lint/typecheck/build; python-spike; isolated package smoke loads WASM | Local requirements verified; no publication |
| A1 Schema and fixtures | Machine validation, stable IDs, revision-aware changes/edges, invalid-input rejection, documented direction and sample | src/model.ts; schema/graph-v1.json; docs/graph-schema-v1.md; fixtures/sample.graph.json; core/resolution tests | Verified within the documented v1 contract |
| A2 Fixture viewer | Offline graph/list, keyboard, filtering, warnings/owners/tests, narrow viewport, escaping and exact-revision links | render.ts; browser-check desktop/320px, graph/list filter state, keyboard focus, no network/console errors; deleted-path source-link assertions | Local checks pass; live public revision links await hosted sandbox; maintainer usefulness feedback absent |
| A3 Git/CLI boundary | Merge-base/direct semantics, missing/shallow/unrelated history, NUL paths, adds/deletes/renames, inert reads, bounds, new outside-root output, exit codes | GitReader; real temporary Git tests; resolution regressions prove zero changes, unrelated-history failure, ceiling/empty-argument exit2 | Local checks pass; no target checkout/script execution |
| A4 JS/TS extraction | Literal/type/dynamic imports, extension/index/alias rules, unsupported relationships visibly uncertain | scan.ts; parser and resolution fixtures; exact/longest-prefix aliases and emitted JS/JSX/declarations; unsupported directory package metadata warns | Implemented/tested supported subset; runtime/package/workspace semantics deliberately not inferred |
| A5 Impact/tests/ownership | Two-revision union, cycles/renames/deletion, truncation, test reasons, current base-tip CODEOWNERS subset | analyze.ts/owners.ts; base-only deletion/rename, cycle/depth/node/file/byte regressions; CODEOWNERS divergence/pattern tests | Local checks pass; actual GitHub owner permissions/team expansion are not asserted |
| A6 Local slice | Four valid offline outputs, repeatable semantic graph, unchanged target tree, measured bounded performance | real Git bundle test; isolated CLI/Action smoke; benchmark report with exact machine/limits and depth warnings | Local checks pass; benchmark is bounded and not exhaustive impact |
| B1 Trusted Action | Immutable trusted bundle, source/dist consistency, read-only exact-SHA consumer workflow, real same-repo/fork run and downloaded artifact | action.yml/dist/action.cjs; CI/template; wrapper tests; isolated smoke; reproducible-build hashes | Partial: actual hosted runs/artifacts missing; no remote branches/main baseline approved |
| B2 Python adapter | Static syntax/source-root/package fixtures, visible ambiguities, offline distributable compatibility and actual hosted Python run | Python grammar/adapters; custom lib root and real ambiguity regressions; isolated WASM CLI/Action proof | Local requirements verified; hosted Python run missing |
| B3 Docs/demo | Installation/permissions/limits/privacy/retention/schema docs, static demo and real maintainer installation | README/docs/index.html/demo; browser docs-to-demo navigation; tarball dry-run includes bin/WASM/notices/schema | Local docs built; publication not authorized; real maintainer installation absent |
| B4 Release/adoption | All engineering evidence including hosted fork behavior and real installation; three real maintainer trials for adoption | RELEASE_EVIDENCE.md plus this audit | Not achieved: hosted and human requirements are missing; no release/deployment/merge approval |

## Corrections from the continuation audit

- Reproduced a false Python ambiguous-root warning for roots root/lib with a unique lib package; count distinct actual matching roots instead of a hardcoded src path.
- Preserve uncertainty for genuine multi-root and module/package conflicts; a module file no longer acquires a guessed sidecar package-member edge.
- Implement emitted JS/JSX/declaration substitution and exact/longest-prefix tsconfig alias selection; unresolved directory package metadata warns instead of guessing an index edge.
- Invalid CLI ceiling/empty-option input returns usage exit2.
- Added zero-change and unrelated-history Git regressions.
- Reproduced a silent CLI launch under the command name patchripple; split importable main from the executable entry and verify the shipped bundle under alternate naming.
- Strengthened browser verification to assert graph filtering, not only list counts.

Verification now includes 30 tests plus strict static checks, build, isolated named-CLI/Action JS/Python smoke, reproducible artifact hashes and offline desktop/mobile/docs navigation checks. These tests are local evidence, not real GitHub fork or maintainer evidence.

## Jev and pending external actions

Bounded Jev preflight/source-evidence reviews completed with typed answers, resolved jev-1.13.0 and usage. The latest post-change source-evidence review selected scan, CLI/module entry, resolution tests, build and package smoke; returned advisory revise_plan/pause_for_user_decision (7,261 input / 158 output tokens). This is plan-tool evidence, not complete code-review approval.

The full-diff helper's generated-file 2 MiB rejection remains unresolved and was not bypassed or retried unchanged. Generated bundles/WASM remain outside complete Jev diff coverage; deterministic packaging verifies their source correspondence, not external review coverage.

The explicit main/publish approval request remains unanswered. The exposed GitHub connector lacks fork creation and rejected forks enumeration with HTTP 400 unsupported endpoint; no gh/browser fallback is permitted. Supply an existing authorized fork through supported connector operations and approve the prepared baseline/test scope before hosted writes. Installation/adoption require real participants; no outreach is authorized.
