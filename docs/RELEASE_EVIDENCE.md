# PatchRipple 0.1.0 release evidence

**Current checklist, 2026-10-05.** This page is the current evidence summary for the 0.1.0 release candidate. Historical audit/proposal pages preserve earlier states. Local checks do not establish hosted behavior, adoption, or release approval.

## Current candidate

| Field | Current state |
| --- | --- |
| Repository | `icecold009/PatchRipple` |
| Public baseline | `codex/ui-impact-explorer` at `48dba51ad9b7c356d206703211885c524cbbffe5` |
| Current candidate | `codex/audit-usability-fixes-2026-10-05` at `b19e9b6a63f6d001e9ddf2164d1110e5981b78d4`; open stacked [PR #4](https://github.com/icecold009/PatchRipple/pull/4), targeting `codex/patchripple-implementation-plan` |
| Package version | `0.1.0`; no release tag or package publication |
| Current hosted run | [Run #18](https://github.com/icecold009/PatchRipple/actions/runs/37342878630) is for the exact candidate above. `npm run verify`, demo generation, generated-file consistency, package smoke, fixture generation, and browser installation succeeded. The first Chromium browser check failed because the warning summary did not focus the first warning; Firefox and WebKit were skipped. No artifact was uploaded. A focused fix is now in this branch; hosted rerun is pending. |
| Earlier hosted baseline | [Run #15](https://github.com/icecold009/PatchRipple/actions/runs/37217024033) succeeded for the earlier public baseline and covered Chromium/Firefox/WebKit, but it does not verify this candidate and produced no artifact. [Run #14](https://github.com/icecold009/PatchRipple/actions/runs/37216580247) is older still. |
| Public demo | The public [interactive synthetic demo](https://patchripple-demo-20261005.sariashaurya09.chatgpt.site/) and [technical walkthrough](https://patchripple-demo-20261005.sariashaurya09.chatgpt.site/technical-walkthrough.html) are deployed separately from a GitHub Action release. The demo uses fictional repository data and SHAs. |
| Product release | Package version `0.1.0`; no Action release tag or Marketplace listing. The connected GitHub tool has no release or Marketplace write route; no CLI or browser fallback was used. |
| Trials and launch posts | [Issue #3](https://github.com/icecold009/PatchRipple/issues/3) has two maintainer invitation comments and no participant reply, installation, or review trial as of 2026-10-05. Show HN copy is prepared but not submitted while the account is signed out; Product Hunt is deferred until a released install path and real trial evidence exist. |

## Evidence matrix

| Gap | Change in this candidate | Current evidence | Remaining gate |
| --- | --- | --- | --- |
| Child TypeScript configs retained removed parent aliases | A declared child `compilerOptions.paths` map replaces inherited aliases. | Regression covers a removed parent alias and the active child mapping. | Validate against additional real repositories without expanding the static config subset silently. |
| Conditional exports selected the import target for `require()` | Package export targets now use the edge's import form; unsupported workspace conditions produce an explicit unresolved warning rather than an invented edge. | Regressions cover import, require, type-only, and unsupported conditions. | Validate package-export edge cases against maintainer reports. |
| Adjacent test suggestions missed extension combinations | `.tsx` and `.ts` sources consider both `.test.ts` and `.test.tsx` conventions; JS/JSX pairs receive the analogous treatment. | Regression covers `button.tsx` with `button.test.ts`; the reason remains labeled as a naming heuristic. | Real maintainers must confirm useful and missed test suggestions. |
| Revision inspection selected only head for files present in both revisions | The inspector shows base/head presence, change status, separate exact-SHA source links, and a repository comparison link. | Chromium checks assert both source links and a modified-status badge; removed files retain base-only attribution. | Confirm reviewer usefulness on real pull requests. |
| Searching hid the import chain around a match | Matching files remain visible with muted neighboring context. The diagram has a focused 0–4-hop control and an 18-node cap. | Browser checks verify a `ui.ts` search retains its core/API chain and context styling. | Real repositories may reveal different useful defaults. |
| Large graphs and long inspectors dominated the report | Package-group filtering/headings, compact neighborhoods, and collapsed relationship/dependent lists reduce the initial view. | Chromium checks cover an 85-candidate graph, group filtering, selection, and a three-hop path; the diagram stays at 18 nodes or fewer. | Observe real graph navigation and larger package layouts. |
| Revision and edge kinds lacked controls | Base/head/both and runtime/type-only filters are available; line styles, colors, and edge titles identify revision and kind. | Local installed Chrome checks exercise both filters. Run #18 failed at warning focus before Firefox/WebKit steps. | A successful hosted Chromium/Firefox/WebKit matrix for the updated candidate remains pending. |
| Changed-file selection displayed an empty-chain message | Changed starting points summarize discovered dependents in base and head. | Browser checks verify those summaries on the demo graph. | Confirm explanation quality during real trials. |
| Warnings hid revision and severity and were hard to find | Warning groups show severity/category, revision, and file; the summary count opens the group and focuses the first warning. | The regression closes the nested warning group before activation and checks it reopens and receives focus. Local Chrome passes; Run #18 exposed the prior failure on hosted Chromium. | Hosted rerun and manual screen-reader comprehension remain unverified. |
| Mobile browsing placed the inspector before the file list | Mobile reports show file browsing first and keep the inspector collapsed until needed; selecting a file opens details, and “Back to files” restores row focus. | Chromium checks at 320px verify no page overflow, inspector disclosure, selection, and focus return. | Physical-device and manual screen-reader checks remain open. |
| Diagnostic-first installation still needs a published pin | README now leads with `doctor`, exact revisions, and an outside output path; the workflow template calls out its immutable-SHA placeholder. | Local CLI, package smoke, and the hosted `verify` step passed on `b19e9b6`; no published candidate pin exists. | Publish a reviewed immutable Action revision and observe a real maintainer installation. |
| Real PR accuracy and usefulness were unvalidated | The trial guide captures expected, missed, and misleading edges plus review usefulness. Invitations are posted in issue #3. | Two invitation comments are visible; no participant reply or trial result is recorded. | One observed installation and three real review trials with independently checked edges. |
| Fork artifact and exact candidate behavior were unverified | The existing fork runbook is retained and linked. | Run #18 is a same-repository PR check and uploaded no artifact. Earlier same-repository artifact evidence is recorded in [HOSTED_EVIDENCE.md](HOSTED_EVIDENCE.md). | An authorized fork must run this exact candidate and validate its artifact. |
| Public onboarding status had stale run and outreach wording | This checklist and [NEXT_STEPS.md](NEXT_STEPS.md) now identify the current candidate, PR, CI result, and current invitation count. | Run #18 failed at Chromium warning focus; issue #3 has two owner invitations and no participant response. | Refresh these two current-status files after a new hosted run or participant feedback. |

## Verification of current candidate and focused fix (2026-10-05)

- Before the focused warning-navigation fix, Run #18's `npm run verify` passed on Ubuntu for `b19e9b6`; the hosted browser check then failed because activating the warning summary did not focus the first warning. Firefox and WebKit were skipped.
- This local Windows run: lint and typecheck passed; `npm.cmd test` reported 39/40. The remaining shallow-clone fixture could not start because Git for Windows `sh.exe` failed to create an OS named object (`NtCreateDirectoryObject`, `0xC0000022`) in the restricted process. This is an environment failure, not a failed product assertion.
- After the focused fix, `npm.cmd run build`, `npm.cmd run demo`, `node scripts/check-build.mjs` (six generated files identical), `npm.cmd run test:package`, and `npm.cmd run test:browser:fixtures` passed.
- After the fix, `PATCHRIPPLE_BROWSER=chromium`, `PATCHRIPPLE_BROWSER_CHANNEL=chrome`, and `PATCHRIPPLE_EDGE_FIXTURES=.tmp/browser-edge-fixtures` with `npm.cmd run test:browser` passed at 1280px and 320px, including collapsed-warning navigation, keyboard selection, search context, filters, exact-revision links, no page errors, no network assets, and no viewport overflow.
- Playwright-managed browser download could not resolve `cdn.playwright.dev`; Firefox and WebKit were not run locally. Manual screen-reader and physical-device reviews remain open. A hosted rerun is needed to confirm the Linux Chromium fix and complete the browser matrix.

## Jev review coverage

- Two current pre-change plan-review calls used `jev-1.13.0` with 14,904 input / 156 output and 14,874 input / 156 output tokens. Both typed outcomes were `ready` with advisory `revise_plan_before_changes` gates and generic scope/assumption signals; repository evidence bounded the work to the reproducible warning-focus failure and stale status text.
- Post-change Jev review used `jev-1.13.0`, 7,660 input / 496 output tokens. It covered the complete 20,106-character hand-authored diff in `src/viewer-client.ts`, `scripts/browser-check.mjs`, `docs/RELEASE_EVIDENCE.md`, and `docs/NEXT_STEPS.md`; no truncation, sensitive files, or binaries. It excluded only mechanically generated `dist/action.cjs`, `dist/cli.cjs`, `docs/BUILD_EVIDENCE.json`, and `docs/demo/index.html`, all checked by build/demo regeneration and `check-build`.
- The typed review outcome was `verification_gap` with gate `resolve_findings_or_human_review`; it returned no concrete file-level finding. Risk signals were correctness 0.46, security 0.07, regression 0.24, test gap 0.67, and context gap 0.41. The verified remaining gaps are the hosted rerun, locally unavailable Firefox/WebKit, and the separate human/fork evidence gates; Jev is advisory, not proof.

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

Run #18 confirms that the core verify, build, package, and fixture steps passed for `b19e9b6`, but its Chromium browser step failed and no artifact was produced. The focused warning-focus fix is local until pushed and checked. No implementation merge, GitHub Pages deployment, Action release, or Marketplace publication occurred in this task; the public synthetic demo Site is a separate preview.

An authorized existing fork is still required to establish fork Action behavior and validate a downloaded artifact for this candidate. Issue #3 contains two invitation comments, but no participant response, installation, or review comparison is recorded. Manual screen-reader behavior is also unverified. The GitHub connector in this session exposes no release or Marketplace write route, so those hosted writes remain blocked; no CLI fallback was used. Show HN and Product Hunt posts remain drafts as described above.

## Historical records

- [HOSTED_EVIDENCE.md](HOSTED_EVIDENCE.md) records the earlier trusted same-repository Action run, artifact digest, and offline inspection.
- [NEXT_STEPS.md](NEXT_STEPS.md) is the fork and maintainer-trial execution kit; its fixed SHAs refer to an earlier candidate.
- [COMPLETION_AUDIT.md](COMPLETION_AUDIT.md) and [HOSTED_VERIFICATION.md](HOSTED_VERIFICATION.md) preserve earlier audit/proposal states and are superseded for current status by this matrix.
- Earlier Jev coverage, including the prior complete-diff size rejection and source-evidence batches, is recorded in the history above and does not cover the current task.
