# PatchRipple 0.1.0 release evidence

**Current checklist, 2026-10-04.** This page is the single current evidence summary for the 0.1.0 release candidate. Historical audit/proposal pages below remain records of earlier states; use this page for current status. A successful local check does not establish hosted behavior, adoption, or release approval.

## Current candidate

| Field | Current state |
| --- | --- |
| Repository | `icecold009/PatchRipple` |
| Feature branch and demo candidate | `codex/ui-impact-explorer` is the public feature branch; this candidate adds a README GIF preview and an offline guided walkthrough. No release tag or package publication. |
| Package version | `0.1.0` in `package.json`; no release tag or package publication |
| Hosted CI | [Run #14](https://github.com/icecold009/PatchRipple/actions/runs/37216580247) passed for candidate `f34b738` in 1m 27s. Verification, deterministic demo build, generated-file stability, package smoke, edge fixtures, and Chromium/Firefox/WebKit checks all passed. It produced no artifact. Earlier [run #13, attempt 2](https://github.com/icecold009/PatchRipple/actions/runs/37211805893) passed on baseline `9e7747f`. |
| Existing hosted baseline | Same-repository Action and downloaded artifact evidence for the earlier implementation is recorded in [HOSTED_EVIDENCE.md](HOSTED_EVIDENCE.md) |
| Pre-existing local work | `docs/IMPLEMENTATION_PLAN.md` is untracked and excluded from this change |
| Release decision | Not approved; no merge, deployment, package publication, or outreach occurred for this update |

## Evidence matrix

| Gap | Improvement in this candidate | Current evidence | Remaining gate |
| --- | --- | --- | --- |
| Empty, incomplete, and large browser cases were opt-in | `scripts/browser-fixtures.ts` creates all three offline bundles; CI always supplies `PATCHRIPPLE_EDGE_FIXTURES` | Hosted run #14 passed empty, incomplete, and 85-candidate checks in Chromium, Firefox, and WebKit; it produced no artifact | Validate the downloaded artifact in an authorized fork |
| First-run demo lacked a guided explanation | Added a 3-step offline walkthrough and a looping GIF preview embedded in the public feature-branch README; the report remains a downloadable, offline HTML bundle | Local Chromium check covers all steps, keyboard activation, report handoff, no network assets/errors, and 320px layout; hosted run #14 checks README/GIF integrity plus Chromium/Firefox/WebKit; the GIF is 960×675, 16 frames/8 seconds, 399 KB | GitHub Pages remains disabled, so the interactive HTML still requires download and local opening |
| Real PR accuracy and usefulness were unvalidated | The trial guide records exact revisions, expected/missed/misleading edges, reviewer usefulness, installation, and feedback | Existing same-repository evidence is a supported synthetic fixture only; no real maintainer trial is recorded | One observed maintainer installation and three real review trials with independently checked edges |
| Fork artifact and exact release version were unverified | Existing fork runbook is retained and linked; it requires exact source/head SHAs and downloaded artifact validation | Same-repository [run #13](https://github.com/icecold009/PatchRipple/actions/runs/37211805893) passed for `9e7747f` but produced no artifact. Repository metadata reports zero forks; the earlier downloaded artifact in [HOSTED_EVIDENCE.md](HOSTED_EVIDENCE.md) predates this candidate | An authorized existing fork and its maintainer are required to verify this exact candidate and validate a downloaded artifact |
| Impact reasons stopped at immediate relationships | Inspector computes the shortest changed-file → importer → dependent chain independently for base and head | Local Chromium checks assert separate base/head multi-step chains; all three browser engines passed in hosted run #14 | A maintainer must confirm these explanations are useful on real PRs and report misleading chains |
| Common monorepo layouts lost edges | Static root workspace patterns (including exclusions), package exports/entries, nearest nested tsconfig, bounded relative `extends`, and common `packages/*/src` Python roots are supported | `npm run verify`: 36/36 tests passed, including workspace, package-export, nested-config, and Python-layout cases; unsupported/missing local metadata remains incomplete | Validate against real missed-edge reports before expanding semantics; no target configuration is executed |
| Expected external imports made normal projects incomplete | Warnings now carry categories for expected external exclusions, unresolved local imports, resource limits, and other uncertainty | `npm run verify` confirms external warnings remain visible without alone making the graph incomplete; unresolved local and limit warnings still do | Confirm user interpretation during maintainer trials |
| Candidate 81+ was list-only | Selecting any visible file redraws a focused neighborhood; changed nodes and relevant chains rank first; SVG remains capped at 80 | Chromium check selects the 85th list candidate and verifies its changed-to-dependent chain appears in the map; hosted run #14 passed Chromium, Firefox, and WebKit checks | Real graph usability feedback |
| Installation required expert setup | README has a short diagnostic-first path; `doctor` checks Node, Git, exact refs, and outside/new output paths without writing | `npm run verify` covers valid refs, missing refs, existing output, and no-write behavior | Observe a real maintainer installation and refine messages from actual failures |
| Scale/browser/accessibility evidence was narrow | Benchmark covers a 1,000-file deep graph, 651-file wide fan-out, and 202-file Python `src` layout; CI checks labels, focus, keyboard, and landmarks across three browser engines | `docs/BENCHMARK.json`: 1.67 s deep/1,000, 2.36 s wide/651 with 151 node omissions, 4.82 s Python/202 on the recorded Windows i3; hosted run #14 passed all three browser jobs | Broader real-repository performance and a manual screen-reader review remain open |
| Historical release statements conflicted | This dated matrix is authoritative; older pages are identified as historical snapshots or linked evidence | This update records the exact run #14 candidate commit, browser jobs, and absence of artifacts; older contradictory summaries below have been replaced | Refresh this matrix after a new candidate or new external evidence |

## Local verification recorded 2026-10-04

- `npm.cmd run verify`: passed strict lint, typecheck, all 36 tests, and build.
- `node scripts/check-build.mjs`: passed; all six generated dist/schema files were byte-identical after rebuild.
- `npm.cmd run test:package`: passed isolated CLI/Action JS/Python WASM smoke without `node_modules` access.
- Generated edge fixtures plus Chromium browser check passed, including keyboard selection, filtering, accessible names/landmarks/status/live-region markup, exact revision chains, offline requests, 320px overflow, and empty/incomplete/85-candidate cases.
- For the guided-demo working-tree change, `npm.cmd run test:browser` passed in Chromium at 1280px and 320px, including all three walkthrough steps, the offline-report link, no network requests, and no page or console errors.
- Desktop and mobile screenshots were visually inspected. This was not a manual screen-reader review.

## Jev review coverage

- Pre-change plan evidence used `jev-1.13.0` in two bounded reviews of six selected files each. Both returned advisory revise-plan gates; repository evidence and the user's explicit implementation request governed execution.
- The post-change complete-diff request exceeded Jev's 45,000-character limit. Jev confirmed no partial diff was sent. The full changed set, including generated `dist/action.cjs` and `dist/cli.cjs`, therefore has no complete-diff review receipt.
- Two post-change source-evidence batches selected `src/scan.ts`, `src/model.ts`, `src/analyze.ts`, `src/cli.ts`, `src/render.ts`, `tests/resolution.test.ts`, `src/viewer.ts`, `src/viewer-client.ts`, `scripts/browser-check.mjs`, `scripts/browser-fixtures.ts`, `.github/workflows/ci.yml`, and this release checklist. They resolved `jev-1.13.0`; each returned an advisory revise-plan gate and `code_review: null`. These bounded source checks do not substitute for full-diff review. Deterministic tests, build consistency, package smoke, and Chromium checks are recorded above.

## Candidate commands

```sh
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:package
npm.cmd run test:browser:fixtures
npm.cmd run test:browser
npm.cmd run benchmark
```

On Windows use `npm.cmd`. Browser checks select `PATCHRIPPLE_BROWSER=chromium`, `firefox`, or `webkit`. Hosted run #13, attempt 2, installed all three engines and passed the generated empty, incomplete, and 85-candidate fixtures in each. `docs/BENCHMARK.json` records synthetic performance only; it is not an accuracy result.

## Warnings and completeness contract

Expected external package imports remain listed as expected exclusions. They do not, by themselves, mark a graph incomplete. Unresolved local or known workspace imports, parser/configuration uncertainty, and resource limits remain visible and mark it incomplete. A complete graph describes only the declared static syntax; it does not imply runtime reach, test coverage, or change safety.

The map contains at most 80 nodes at once. The full candidate list contains up to the separate 500-node analysis ceiling and can focus the diagram on any visible candidate. Benchmark limits and omitted counts remain explicit.

## External evidence and exact release gate

Hosted run #14 passed for the published feature-branch candidate `f34b738` and produced no artifact; run #13 attempt 2 records the earlier `9e7747f` baseline. The older downloaded same-repository artifact verifies its documented earlier revision only. The public feature-branch README carries the GIF preview, while GitHub Pages is disabled and the interactive HTML still requires download and local opening. The latest source is not merged to `main`, and no package release is published.

Fork verification still requires an authorized existing fork because the available GitHub connector has no fork-creation operation. Repository metadata currently reports zero forks. Do not substitute a same-repository branch for a fork. Real usefulness requires actual maintainers and review comparisons; proposed repositories, fixtures, and automated tests do not count as trials. Manual screen-reader behavior also remains unverified. No outreach, Pages enablement, release publication, or merge to `main` is implied by this checklist.

## Historical records

- [HOSTED_EVIDENCE.md](HOSTED_EVIDENCE.md) records the earlier trusted same-repository Action run, artifact digest, and offline inspection.
- [NEXT_STEPS.md](NEXT_STEPS.md) is the fork and maintainer-trial execution kit; its historical fixed SHAs apply only to the earlier candidate.
- [COMPLETION_AUDIT.md](COMPLETION_AUDIT.md) and [HOSTED_VERIFICATION.md](HOSTED_VERIFICATION.md) preserve earlier audit/proposal states and are superseded for current status by this matrix.
