# PatchRipple release evidence

**Snapshot date: 2026-10-13.** Public `main` is `4b45616e941ebe349b845a62a8941c586fbb18c5`. Draft PR #7 is open. Its latest code-bearing head `c38fc1c2e26987a490c623a8a6c99750709f5165` passed Trusted PatchRipple CI #50 and Static PR impact #16. A later documentation-only update records this snapshot. PR #7 is not part of `main` or a versioned release.

## Verified repository state

| Field | Evidence |
| --- | --- |
| Current `main` | `4b45616e941ebe349b845a62a8941c586fbb18c5`, merge commit for PR #6. |
| PR #4 | Merged into `main`; it is no longer an open candidate. |
| PR #6 | Merged into `main`. Its exact head is `a19393fb0580bc8ba0e9c2c4c7d1e9519717eedb`, with base `de4809c07e3e0cb3acd1f0f3a761e27584071929`. |
| Hosted checks for PR #6 head | Trusted PatchRipple CI run [#38](https://github.com/icecold009/PatchRipple/actions/runs/37825075606) and Static PR impact run [#11](https://github.com/icecold009/PatchRipple/actions/runs/37825075604) both completed successfully on the exact head. |
| PR #7 | Open draft PR from `codex/close-all-gaps-2026-10-13` to `main`; it is not merged. |
| Hosted checks for PR #7 code-bearing head | Trusted PatchRipple CI run [#50](https://github.com/icecold009/PatchRipple/actions/runs/38354258217) and Static PR impact run [#16](https://github.com/icecold009/PatchRipple/actions/runs/38354257158) both succeeded on `c38fc1c2e26987a490c623a8a6c99750709f5165`. CI passed lint, typecheck, all 52 tests, build consistency, package smoke, generated browser fixtures, and Chromium, Firefox, and WebKit checks. |
| Same-repository artifact | Run #11 uploaded `patchripple-6`, artifact ID `11571191337`, digest `sha256:b73ba78d4ed6a64feaac3a7d34f24f5b16420df0b9cb7085c32227ef8114cf1d`. The artifact listing showed expiry at `2026-10-22T18:32:37Z`. Its existence is same-repository evidence, not fork evidence. |
| Tags and GitHub Releases | The connector returned an empty tag-ref list and an empty GitHub Releases list. No versioned GitHub release is established. npm registry publication was not checked in this review. |
| Forks | Repository metadata reported `forks_count: 0`. The connector rejected the fork-list endpoint with HTTP 400 and exposes no fork-creation tool, so no fork artifact was available to verify. |
| Maintainer trials | Issue [#3](https://github.com/icecold009/PatchRipple/issues/3) is open with three invitation comments and no participant reply or completed installation/review trial. |

## Gap closure matrix

| Gap | Current state and evidence | Remaining evidence gate |
| --- | --- | --- |
| Browser edge cases in CI | PR #6 head passed Trusted PatchRipple CI run #38. The workflow installs and runs Chromium, Firefox, and WebKit checks. | Consumer-side browser behavior on a real repository remains separate from the project’s generated fixtures. |
| “Why affected” explanations | Revision-specific import chains are part of the report data and viewer. | A maintainer must confirm that the explanation is useful during a real review. |
| Warning classification | Expected external imports, unresolved local/workspace imports, unsupported configuration, and resource limits have distinct warning paths. | Real repositories may reveal additional configuration cases. |
| Large-graph navigation | The report supports focused neighborhoods, hop/filter controls, and keyboard selection while limiting the diagram to 18 nodes. | Larger real repositories and assistive-technology use still need direct observation. |
| Monorepo/configuration support | `package.json` workspace declarations, package exports, and in-repository relative TypeScript alias inheritance are supported. PR #7 adds a bounded parser for simple `pnpm-workspace.yaml` package lists and flags non-empty TypeScript project references as unsupported. Local verification passed 52/52 tests; exact code-head CI #50 and impact #16 succeeded. | Complex YAML, advanced glob patterns, external `tsconfig` inheritance, and project-reference build semantics remain unsupported; project references now produce an explicit incomplete-analysis warning. This work is not released until PR #7 is merged and a versioned release is published. |
| Setup and history | README and landing page now give a full-SHA source install and a hook-disabled exact-ref fetch command. `doctor` remains read-only. | A real maintainer must complete the install; shallow or private-repository fetch behavior needs that user’s environment and permissions. No versioned release is established. |
| Scale, accuracy, and accessibility | `docs/BENCHMARK.json` contains synthetic performance bounds. A local self-hosted analysis of PR #6 found 7 changed paths, 17 candidate nodes, 14 revision-attributed edges, and 22 warnings (6 binary exclusions, 4 source-size limits, and 12 expected external imports); it correctly remained incomplete under its limits. A second bounded comparison against merged public PR `sindresorhus/p-limit#109` is recorded below. It exposed and led to a resolver fix: JavaScript runtime imports now prefer runtime implementation files over declaration sidecars. | Two developer-run samples do not establish broad real-repository accuracy. The second is a single manually checked public PR and is not an independent maintainer trial. Screen-reader comprehension and physical-device behavior remain unobserved. |
| Release documentation | This page, `NEXT_STEPS.md`, the README, landing page, and consumer workflow template now use the merged `main` pin and current PR state. | Recheck the snapshot whenever `main`, hosted evidence, or participant status changes. |
| Fork and release verification | Same-repository PR checks and artifact metadata are available. No GitHub tags/releases were listed; repository metadata showed zero forks at lookup. | A real cross-repository PR run and downloaded artifact are still required. A versioned GitHub release/tag must be created through an authorized publication path. |
| Maintainer installation/adoption | Invitations and a structured blank trial record exist. No participant completed a trial. | One observed installation and three real maintainer review trials with independently assessed expected, missed, and misleading candidates. |

## Self-hosted PR #6 analysis

On 2026-10-13, the bundled CLI analyzed the actual merged PR #6 using its exact base and head. The local report contained the seven changed paths, reverse import candidates in `src/`, related tests, and separate base/head relationships. The 22 warnings were accounted for as binary exclusions, two bundled files over the source-size ceiling, and expected external package imports. Because the size limits prevented reading both bundled artifacts, the report marked itself incomplete. This is a useful self-hosted repository sanity check; it is not an independent gold-standard comparison or a maintainer trial.

The same-repository hosted artifact metadata is recorded above. Its ZIP content was not independently downloaded and inspected during this review, and the run did not originate from a fork.

## Bounded real-repository PR comparison

On 2026-10-13, the local CLI analyzed merged public PR [sindresorhus/p-limit#109](https://github.com/sindresorhus/p-limit/pull/109) using exact base `df476048d023ff868cd45b35ee47f5fb0ca2b25a` and head `e7ad1d7688b111c7406869971e5e6d61a385007e`. The PR patch and relevant source imports were inspected manually. Its five changed paths included `index.js` and `index.d.ts`; runtime files `benchmark.js` and `test.js` import `./index.js`, while `index.test-d.ts` imports `./index.js` for a declaration test.

The first local run incorrectly attributed the two runtime importers to `index.d.ts` and still reported a complete graph. The resolver was changed to select candidates using the importer file and import kind, and three focused regression cases were added. After the fix, the report contained six candidates and six revision-specific edges: the three expected importer-to-target relationships on both base and head (`benchmark.js` and `test.js` to `index.js`; `index.test-d.ts` to `index.d.ts`). It reported 12 expected-external warnings, zero omitted nodes or edges, and `complete: true`. Re-running with the final bundled code produced the same graph SHA-256: `04674a51b74aba0f65dbf5a202b32c3178ac01a64504d5fe3a762ff176c1a8c0`.

This is one bounded developer-run comparison, not a broad accuracy study or participant trial. The importer-sensitive resolver fix and the project-reference warning are on PR #7 code-bearing head `c38fc1c2e26987a490c623a8a6c99750709f5165`, which passed hosted checks #50 and #16.

## Manual validation protocol

For a screen-reader trial, record browser, operating system, reader/version, date, and consent. Check landmarks and headings, file-list navigation, search/filter announcements, selection state, inspector disclosure and return focus, warning category/severity, and exact-revision links. Record a specific confusing or missing announcement; keyboard/browser automation does not substitute for this observation.

For a physical-device trial, record device/model, OS/browser version, viewport, date, and consent. Open the offline report, navigate and select files, filter/search, expand warnings and the inspector, verify focus/scroll behavior, and check for horizontal overflow. Do not replace this with emulation or a resized desktop window.

Use [MAINTAINER_TRIAL_TEMPLATE.csv](MAINTAINER_TRIAL_TEMPLATE.csv) for real-repository accuracy and maintainer feedback. Do not enter synthetic results as participant evidence.

## Release gate

PatchRipple has not established a versioned GitHub release, a fork artifact, an observed maintainer installation, three completed maintainer trials, manual screen-reader results, or physical-device results. Same-repository CI and a self-hosted analysis do not close these gates. Preserve them as open until the corresponding evidence is recorded.
