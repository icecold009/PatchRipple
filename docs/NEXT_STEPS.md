# Remaining verification and maintainer trials

Prepared 2026-10-03. This guide is an execution kit, not evidence that a person completed a trial. Same-repository evidence is in HOSTED_EVIDENCE.md. The implementation remains a draft; merging, deployment and package publication require separate approval.

## Fixed references

| Purpose | Revision |
| --- | --- |
| Trusted Action and CLI with mobile correction | `528902572d5c6b5f18cf68e4a527472b421fc6ad` |
| Public sandbox base | `95e34be0f5679a3b4430d710de4950015b60819a` |
| Completed same-repository fixture head | `e2d34f8d9bed9e440d7568a69c52a770c1355022` |
| Implementation PR | https://github.com/icecold009/PatchRipple/pull/1 |
| Verification-only PR | https://github.com/icecold009/PatchRipple/pull/2 |

## Fork prerequisite and execution

The connector has no fork-creation operation. The user subsequently authorized browser inspection. GitHub's signed-in repository page reports: "You own icecold009/PatchRipple and are not a member of any organizations." No fork can be created from that account in the observed session. Another authorized GitHub user must supply an existing fork URL; do not invent a second identity or label a same-repository branch a fork.

After a collaborator supplies the fork:

1. Use the GitHub connector first to read the fork metadata. Confirm its parent/source is icecold009/PatchRipple, that it is public, and that the requested branch/files can be written. If permission is absent, stop that hosted write; the fork owner can prepare their branch and supply its URL.
2. Start a separate fork feature branch from the sandbox base above. In sandbox/src/core.ts change `export const value = 1;` to `export const value = 2;`; in sandbox/python/pkg/lib.py change `VALUE = 1` to `VALUE = 2`. Preserve the base workflow. Neither fixture is executed.
3. Open a draft fork PR targeting icecold009/PatchRipple main. Record repository identities, PR number, exact base tip/head and trusted Action pin. Do not merge it.
4. Inspect the run and job steps. Expected permissions are contents:read; the workflow fetches the base repository's PR head ref and verifies exact objects. Do not install target dependencies, run target tests/configuration, add secrets, or substitute pull_request_target. If GitHub requests fork-run approval, obtain the authorized repository maintainer's approval for that specific run.
5. Download the four-file artifact through the connector; compare ZIP SHA256 with the returned digest. Validate graph schema and exact SHAs, two changed paths, JS importer/test and Python relative importer, and revision-attributed edges. Inspect completeness/warnings instead of assuming exit0 means completeness.
6. Open the original downloaded index.html offline, select the long Python path at320px, verify keyboard/file filtering and exact-revision source links, and record no HTTP asset requests or page errors. Record results independently; the prior same-repository artifact is not fork proof.

Artifacts have14-day retention and require GitHub sign-in/repository access. Save approved evidence before expiration. Output exposes paths and CODEOWNERS; review it before wider sharing. Permanent anonymous hosting is a separate publication decision.

## Maintainer installation trial

A real maintainer should follow the published README at the trusted revision and run the bundle on an authorized public JS/TS or Python comparison. Node24 and Git are required. Use a new trusted tool directory; no installation/build is needed in the target repository.

```sh
git clone https://github.com/icecold009/PatchRipple.git /path/to/trusted-PatchRipple
git -C /path/to/trusted-PatchRipple checkout --detach 528902572d5c6b5f18cf68e4a527472b421fc6ad
node /path/to/trusted-PatchRipple/dist/cli.cjs --version
node /path/to/trusted-PatchRipple/dist/cli.cjs analyze --repo /path/to/target --base BASE_COMMIT --head HEAD_COMMIT --repository https://github.com/OWNER/REPO --out /path/to/new-offline-bundle
```

The sample paths/SHAs are placeholders for the participant's environment. Fetch missing exact target objects first; output must be a new directory outside that target. Never execute target hooks/scripts/configuration to make the analyzer work. Prefer a comparison with an expected importer and a relevant test that the maintainer can independently assess. Python layouts may need explicit --python-roots .,src.

Record whether the maintainer independently installed the trusted bundle, understood warnings/limits, distinguished static candidates from runtime/test coverage, and opened the offline artifact. Local automated checks do not satisfy this human requirement.

## Three public-repository adoption trials

Select three authorized public repositories with actual maintainers willing to try the tool. Use real review comparisons and record participant feedback; proposed repositories alone are not trials. No invitation has been sent and no recipient has been selected.

For each trial, record exact tool/base/head revisions, language/layout, expected and observed edges, missed/misleading candidates, whether ownership/test reasons were useful, and whether the map changed the maintainer's review focus. Ask for a concrete example and a limitation rather than a generic approval. Obtain permission before storing attributable feedback; use only task-relevant information.

| Trial | Participant/repository | Exact revisions | Installation observed | Review usefulness and missed edges | Evidence link/date | State |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Not selected | Unknown | Unknown | Unknown | None | Not started |
| 2 | Not selected | Unknown | Unknown | Unknown | None | Not started |
| 3 | Not selected | Unknown | Unknown | Unknown | None | Not started |

Draft invitation for a selected willing participant: "Would you try PatchRipple on one public JS/TS or Python PR you maintain? It produces an offline map of static dependents, related-test evidence and owners. It executes no target code and does not claim runtime impact or safety. Please record one useful review observation and one missing or misleading edge. The pinned trial guide is available; participation is optional." Sending requires an identified recipient and the user's instruction to contact them.

## Completion gates

- Fork engineering gate: an actual cross-repository PR run and independently validated downloaded artifact.
- Human installation gate: observed maintainer installation and comprehension of uncertainty/artifact access.
- Adoption gate: three recorded public-repository maintainer trials with real feedback.
- Release actions: separate explicit approval for implementation merge, deployment or package publication. Jev remains advisory; the original full implementation still lacks complete diff coverage. No receipt replaces the engineering/human gates above.
