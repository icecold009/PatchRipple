# PatchRipple: remaining validation work

**Status snapshot: 2026-10-13.** Public `main` is `4b45616e941ebe349b845a62a8941c586fbb18c5`. PR #4 and PR #6 are merged. PR #6's exact head `a19393fb0580bc8ba0e9c2c4c7d1e9519717eedb` passed Trusted PatchRipple CI run #38 and Static PR impact run #11. Draft PR #7 is open; its latest code-bearing head `891ded716700fb56b781f2ece7a66a3c1c550df8` passed Trusted PatchRipple CI run #54 and Static PR impact run #18. It includes the importer-sensitive resolver correction, an explicit warning for unsupported TypeScript project references, and bounded support for one flat workspace brace group with 2–16 alternatives. Local verification for that code head passed 55 tests, package smoke, and generated-file consistency for six files. PR #7 is not merged or released. See [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md) for evidence boundaries.

## Use the current pinned source

There is no GitHub release or version tag in the current evidence snapshot. To use the bundled CLI, follow the full-SHA installation and exact-ref fetch commands in the [README](../README.md). The current Action template pins `4b45616e941ebe349b845a62a8941c586fbb18c5`; it is an immutable pre-release commit pin.

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

The current code supports `package.json` workspace arrays/objects, package export maps, relative in-repository `tsconfig` inheritance, and simple top-level `packages:` lists from `pnpm-workspace.yaml`. Each workspace pattern may use one flat brace group with 2–16 nonempty alternatives. The code-bearing head passed hosted CI #54 and impact run #18; local verification passed 55 tests, package smoke, and generated-file consistency for six files. It also reports non-empty `tsconfig.references` as unsupported so the graph is incomplete when project-reference build semantics may matter. This support is implemented on the open PR branch but is not released. Complex YAML, bracket character classes, nested or malformed brace groups, groups with more than 16 alternatives, external TypeScript config inheritance, and project-reference build semantics remain unsupported.

The PR #6 self-hosted check is a bounded sample: 7 changed files, 17 candidates, 14 revision-attributed edges, and an incomplete result due to binary and source-size warnings. A second bounded check used merged public PR [sindresorhus/p-limit#109](https://github.com/sindresorhus/p-limit/pull/109). Manual source/patch review caught a false runtime-to-declaration edge that the old resolver reported as complete. The fix and regression cases now produce the expected runtime and declaration edges for this PR; see [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md). This developer-run sample improves evidence but does not substitute for several independently scored real-repository trials with maintainers.

## Versioned publication

The GitHub tag-ref and release lists were empty on 2026-10-13. The current Action pin is usable as a full immutable commit reference, but it is not a versioned release. After the fork, human, accessibility, and compatibility gates are evidenced, publish a reviewed versioned tag/release through an authorized GitHub publication route and update the release checklist to the exact published SHA. No merge, release, registry publication, or outreach was performed for this status refresh.
