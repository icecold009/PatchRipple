# PatchRipple: remaining validation work

**Status snapshot: 2026-10-13.** Public `main` is `4b45616e941ebe349b845a62a8941c586fbb18c5`. PR #4 and PR #6 are merged. PR #6's exact head `a19393fb0580bc8ba0e9c2c4c7d1e9519717eedb` passed Trusted PatchRipple CI run #38 and Static PR impact run #11. Draft PR #7 remains open; its live page shows the exact current head and checks. Earlier PR head `2f670d63ab6833b226fd7c9686954da3d58d772c` passed Trusted PatchRipple CI #68 and Static PR impact #25. Current code-bearing commit `a6be403338c28e27b081a8839f6f85ac6836ac89` fixes root-relative package imports found by the Express sample and includes a regression test. Local lint, typecheck, all 59 tests, build, package smoke, and generated-file consistency passed. Exact-head hosted checks also passed: Trusted PatchRipple CI [#70](https://github.com/icecold009/PatchRipple/actions/runs/38427654921) and Static PR impact [#26](https://github.com/icecold009/PatchRipple/actions/runs/38427655088). CI #70 includes generated browser fixtures and Chromium, Firefox, and WebKit checks. PR #7 is not merged or released. See [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md) for current evidence and limits.

## Use the current pinned source

There is no versioned GitHub release or tag, and the public npm registry has no `patchripple` package in this snapshot. This full-SHA HTTPS archive installed into an isolated npm global prefix; the CLI reported version 0.1.0 and displayed its help:

```sh
npm install --global --ignore-scripts --no-audit --no-fund "https://github.com/icecold009/PatchRipple/archive/a6be403338c28e27b081a8839f6f85ac6836ac89.tar.gz"
patchripple --version
```

This is a draft pre-release candidate, not a merged or versioned release. The merged `main` and consumer Action pin remain `4b45616e941ebe349b845a62a8941c586fbb18c5`. For a public GitHub PR whose commits are missing locally, run `patchripple fetch-pr --repo PATH --repository OWNER/REPO --base-branch BRANCH --pr NUMBER`; it writes the two documented PatchRipple refs without changing the checkout. See the [README](../README.md) for the complete doctor/analyze steps and limitations.

## Complete a real fork artifact run

The repository metadata reported `forks_count: 0` when checked on 2026-10-13. The connected GitHub route rejected fork enumeration with HTTP 400 and has no fork-creation operation. A collaborator must provide an authorized existing fork URL before a real cross-repository run can happen.

When a fork is available:

1. Use the GitHub connector first to verify its `parent` is `icecold009/PatchRipple`, its visibility, and the requested branch permissions.
2. Create a fork-only feature branch based on `main` at `4b45616e941ebe349b845a62a8941c586fbb18c5`. Change only the two existing sandbox values: `sandbox/src/core.ts` from `1` to `2`, and `sandbox/python/pkg/lib.py` from `1` to `2`. Do not execute fork code or configuration.
3. Open a draft PR from that fork to `icecold009/PatchRipple:main`. Record fork URL, PR number, exact base/head SHAs, and the trusted Action pin. Do not merge it.
4. Confirm the workflow uses `pull_request`, `contents: read`, `persist-credentials: false`, and the pinned trusted Action. Inspect every job step and do not approve a run without the fork owner's or repository maintainer's authorization.
5. Download the artifact through the GitHub connector, verify the ZIP SHA-256 against GitHub's artifact digest, and inspect the four bundle files. Confirm the exact SHAs, both changed paths, JavaScript and Python importer edges, warning/completeness state, and offline viewer behavior at a narrow viewport.
6. Record the result separately from same-repository run #11 and its artifact. A same-repository artifact is not fork evidence.

## Complete maintainer trials

Issue [#3](https://github.com/icecold009/PatchRipple/issues/3) has three invitation comments and no participant reply or completed trial. No additional messages were sent as part of this task.

For one observed installation and three distinct real-review trials, use [MAINTAINER_TRIAL_TEMPLATE.csv](MAINTAINER_TRIAL_TEMPLATE.csv). Record exact tool/base/head revisions, language and layout, expected/observed/missed/misleading edges, warning comprehension, offline report access, and whether review focus changed. Obtain permission before retaining attributable feedback. Invitations, synthetic fixtures, and self-hosted analysis do not count as completed trials.

## Record manual accessibility and device evidence

The hosted browser suite and keyboard checks do not establish screen-reader comprehension or physical-device behavior. For a screen-reader session, record reader/browser/OS versions and test headings/landmarks, file-list navigation, search/filter announcements, selection, inspector disclosure and return focus, warning groups, and exact-revision links. For a physical-device session, record device/model, OS/browser versions and viewport; inspect file navigation, filters, warnings, inspector/scroll behavior, and horizontal overflow. Keep consent and observations with the evidence record. Emulation does not count as a physical-device result.

## Resolve remaining compatibility evidence

The current code supports `package.json` workspace arrays/objects, package export maps, relative in-repository `tsconfig` inheritance, and simple top-level `packages:` lists from `pnpm-workspace.yaml`. Each workspace pattern may use multiple flat brace groups with 2–16 nonempty alternatives per group and at most 256 expansions per workspace declaration. The current code-bearing commit `a6be403338c28e27b081a8839f6f85ac6836ac89` includes these earlier workspace changes plus the Express root-import fix. Local verification passed lint, typecheck, all 59 tests, build, package smoke, and generated-file consistency for six files; hosted CI #70 and impact check #26 succeeded on this exact code commit. Non-empty `tsconfig.references` is reported as unsupported so the graph is incomplete when project-reference build semantics may matter. This support is implemented on the open PR branch but is not released. Complex YAML, bracket character classes, nested or malformed brace groups, groups with more than 16 alternatives, declarations exceeding the 256-expansion cap, external TypeScript config inheritance, and project-reference build semantics remain unsupported.

The PR #6 self-hosted check is a bounded sample: 7 changed files, 17 candidates, 14 revision-attributed edges, and an incomplete result due to binary and source-size warnings. A second bounded check used merged public PR [sindresorhus/p-limit#109](https://github.com/sindresorhus/p-limit/pull/109); manual source/patch review caught a false runtime-to-declaration edge that the old resolver reported as complete. Three additional exact-SHA comparisons covered merged PRs in Flask, Packaging, and Express. Manual source inspection corroborated 17 direct importer-to-changed-source relationships across those samples, but all three graphs were incomplete under repository warnings. The complete scope, SHAs, warning counts, and limits are in [REAL_REPOSITORY_SAMPLES.md](REAL_REPOSITORY_SAMPLES.md). These developer-run samples improve evidence but do not substitute for independently scored maintainer trials or broad real-repository accuracy evidence.

## Versioned publication

The GitHub tag-ref and release lists were empty on 2026-10-13, and the public registry query `npm view patchripple` returned E404. The current Action pin is usable as a full immutable commit reference, but it is not a versioned release. The connected GitHub tools expose read-only fetch for these endpoints and no fork-creation or release-publication operation; the fork-list request returned HTTP 400. Do not use a CLI or alternate route for those hosted operations. After an authorized fork and the human, accessibility, and compatibility gates are evidenced, publish a reviewed versioned tag/release through an available authorized GitHub publication route and update the release checklist to the exact published SHA. No merge, release, registry publication, or outreach was performed for this status refresh.
