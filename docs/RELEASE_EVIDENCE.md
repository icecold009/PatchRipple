# PatchRipple 0.1.0 release evidence

**Current checklist, 2026-10-05.** This page is the current evidence summary for the 0.1.0 release candidate. Historical audit/proposal pages preserve earlier states. Local checks do not establish hosted behavior, adoption, or release approval.

## Current candidate

| Field | Current state |
| --- | --- |
| Repository | `icecold009/PatchRipple` |
| Public baseline | `codex/ui-impact-explorer` at `48dba51ad9b7c356d206703211885c524cbbffe5` |
| Local candidate | `codex/audit-usability-fixes-2026-10-05`, based on `48dba51`; this task's changes have no hosted run or artifact yet |
| Package version | `0.1.0`; no release tag or package publication |
| Latest hosted baseline check | [Run #15](https://github.com/icecold009/PatchRipple/actions/runs/37217024033): the `verify` job and all reported steps succeeded, including verify, generated-file consistency, package smoke, and Chromium/Firefox/WebKit checks. It produced no artifact. The supplied audit associates it with the public baseline above; the connector's job response did not include the run head SHA. Earlier [run #14](https://github.com/icecold009/PatchRipple/actions/runs/37216580247) covered candidate `f34b738` and is historical. |
| Pre-existing local work | Untracked `docs/IMPLEMENTATION_PLAN.md` is preserved and excluded from this task |
| Release decision | No merge, deployment, or package publication is part of this task. Maintainer invitations are posted in [issue #3](https://github.com/icecold009/PatchRipple/issues/3); no trial or participant feedback is recorded. |

## Evidence matrix

| Gap | Change in this candidate | Current evidence | Remaining gate |
| --- | --- | --- | --- |
| Child TypeScript configs retained removed parent aliases | A declared child `compilerOptions.paths` map replaces inherited aliases. | Regression covers a removed parent alias and the active child mapping. | Validate against additional real repositories without expanding the static config subset silently. |
| Conditional exports selected the import target for `require()` | Package export targets now use the edge's import form; unsupported workspace conditions produce an explicit unresolved warning rather than an invented edge. | Regressions cover import, require, type-only, and unsupported conditions. | Validate package-export edge cases against maintainer reports. |
| Adjacent test suggestions missed extension combinations | `.tsx` and `.ts` sources consider both `.test.ts` and `.test.tsx` conventions; JS/JSX pairs receive the analogous treatment. | Regression covers `button.tsx` with `button.test.ts`; the reason remains labeled as a naming heuristic. | Real maintainers must confirm useful and missed test suggestions. |
| Revision inspection selected only head for files present in both revisions | The inspector shows base/head presence, change status, separate exact-SHA source links, and a repository comparison link. | Chromium checks assert both source links and a modified-status badge; removed files retain base-only attribution. | Confirm reviewer usefulness on real pull requests. |
| Searching hid the import chain around a match | Matching files remain visible with muted neighboring context. The diagram has a focused 0–4-hop control and an 18-node cap. | Browser checks verify a `ui.ts` search retains its core/API chain and context styling. | Real repositories may reveal different useful defaults. |
| Large graphs and long inspectors dominated the report | Package-group filtering/headings, compact neighborhoods, and collapsed relationship/dependent lists reduce the initial view. | Chromium checks cover an 85-candidate graph, group filtering, selection, and a three-hop path; the diagram stays at 18 nodes or fewer. | Observe real graph navigation and larger package layouts. |
| Revision and edge kinds lacked controls | Base/head/both and runtime/type-only filters are available; line styles, colors, and edge titles identify revision and kind. | Browser checks exercise revision and edge-kind filters. | Cross-browser hosted verification of this local candidate remains pending. |
| Changed-file selection displayed an empty-chain message | Changed starting points summarize discovered dependents in base and head. | Browser checks verify those summaries on the demo graph. | Confirm explanation quality during real trials. |
| Warnings hid revision and severity and were hard to find | Warning groups show severity/category, revision, and file; the summary count opens and focuses the warning list. | Chromium checks verify warning navigation and grouped warning output. | Manual screen-reader comprehension remains unverified. |
| Mobile browsing placed the inspector before the file list | Mobile reports show file browsing first and keep the inspector collapsed until needed; selecting a file opens details, and “Back to files” restores row focus. | Chromium checks at 320px verify no page overflow, inspector disclosure, selection, and focus return. | Physical-device and manual screen-reader checks remain open. |
| Real PR accuracy and usefulness were unvalidated | The trial guide captures expected, missed, and misleading edges plus review usefulness. Invitations are posted in issue #3. | Connector read found the open invitation thread and two invitation comments; no maintainer response or trial result was present. | One observed installation and three real review trials with independently checked edges. |
| Fork artifact and exact candidate behavior were unverified | The existing fork runbook is retained and linked. | Run #15 had no artifact and does not cover this local task branch. Earlier same-repository artifact evidence is recorded in [HOSTED_EVIDENCE.md](HOSTED_EVIDENCE.md). | An authorized fork must run this exact candidate and validate its artifact. |
| Public onboarding status had stale run and outreach wording | Current run, branch, and invitation status are refreshed in this checklist and [NEXT_STEPS.md](NEXT_STEPS.md). | Run #15's job succeeded; issue #3 contains invitations, with no completed trial. | Refresh after hosted checks or participant feedback changes. |

## Local verification recorded 2026-10-05

- `npm.cmd run lint` and `npm.cmd run typecheck`: passed.
- `npm.cmd test`: 40/40 passed. The existing shallow-clone fixture required local Git/MSYS access outside the restricted sandbox.
- `npm.cmd run build` and `npm.cmd run demo`: passed.
- `node scripts/check-build.mjs`: six generated files remained byte-identical after rebuild.
- `npm.cmd run test:package`: passed isolated CLI/Action JS/TS/Python WASM smoke.
- `npm.cmd run test:browser:fixtures`: generated empty, incomplete, and 85-candidate offline reports.
- `PATCHRIPPLE_BROWSER_CHANNEL=chrome` with `PATCHRIPPLE_EDGE_FIXTURES=.tmp/browser-edge-fixtures`, then `npm.cmd run test:browser`: passed Chromium checks at 1280px and 320px, including keyboard selection, search context, filters, warnings, exact revision links, mobile focus return, empty/incomplete/large cases, no page errors, no network assets, and no viewport overflow.
- Firefox and WebKit were not run locally for this task. The hosted browser result above is for the earlier public baseline, not these unhosted changes. Manual screen-reader review remains open.

## Jev review coverage

- Two pre-change plan-review calls used `jev-1.13.0`, with 18,448 input / 158 output tokens and 18,378 input / 158 output tokens. Both returned advisory `revise_plan_before_changes` gates and `code_review: null`; the task was split into ordered resolver, viewer, and documentation slices. These plan reviews do not count as code review.
- The earlier implementation's complete-diff and bounded-review history is preserved below as historical evidence; it does not cover this task's diff.

## Candidate commands

```sh
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
node scripts/check-build.mjs
npm.cmd run test:package
npm.cmd run test:browser:fixtures
npm.cmd run test:browser
```

On Windows use `npm.cmd`. Browser checks accept `PATCHRIPPLE_BROWSER=chromium`, `firefox`, or `webkit`; `PATCHRIPPLE_BROWSER_CHANNEL=chrome` uses the installed Chrome channel. Browser fixtures are included when `PATCHRIPPLE_EDGE_FIXTURES` points to their generated directory. `docs/BENCHMARK.json` records synthetic performance only; it is not an accuracy result.

## Warnings and completeness contract

Expected external package imports remain visible as expected exclusions and do not, by themselves, make a graph incomplete. Unresolved local or known workspace imports, parser/configuration uncertainty, and resource limits remain visible and mark it incomplete. A complete graph describes only the declared static syntax; it does not imply runtime reach, test coverage, or change safety.

The diagram shows at most 18 nodes at once. Hop depth, revision, and edge-kind filters refine the neighborhood; the file list retains all analyzed candidates up to the 500-node analysis ceiling. Omitted counts describe encountered candidates, not undiscovered descendants.

## External evidence and release gate

Run #15 confirms hosted checks for the public baseline, but no artifact was produced. The local `codex/audit-usability-fixes-2026-10-05` candidate has not been pushed or checked by hosted CI. No implementation merge, deployment, or package release occurred in this task.

An authorized existing fork is still required to establish fork Action behavior and validate a downloaded artifact for this candidate. Issue #3 contains maintainer-trial invitations, but no participant response, installation, or review comparison is recorded. Manual screen-reader behavior is also unverified. Further outreach, Pages enablement, release publication, merge, and deployment are separate actions.

## Historical records

- [HOSTED_EVIDENCE.md](HOSTED_EVIDENCE.md) records the earlier trusted same-repository Action run, artifact digest, and offline inspection.
- [NEXT_STEPS.md](NEXT_STEPS.md) is the fork and maintainer-trial execution kit; its fixed SHAs refer to an earlier candidate.
- [COMPLETION_AUDIT.md](COMPLETION_AUDIT.md) and [HOSTED_VERIFICATION.md](HOSTED_VERIFICATION.md) preserve earlier audit/proposal states and are superseded for current status by this matrix.
- Earlier Jev coverage, including the prior complete-diff size rejection and source-evidence batches, is recorded in the history above and does not cover the current task.
