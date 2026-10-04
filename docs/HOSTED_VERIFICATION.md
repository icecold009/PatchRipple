# Historical hosted verification proposal

**Historical proposal dated 2026-10-03.** The earlier same-repository run and artifact subsequently completed; see [HOSTED_EVIDENCE.md](HOSTED_EVIDENCE.md). This proposal does not describe hosted verification of the current unpublished `codex/ui-impact-explorer` working tree. [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md) is the current checklist.

Approved by the user on 2026-10-03: minimal main baseline, feature publication and same-repository/fork verification scope below. Implementation merge, deployment, registry publication and outreach remain outside this approval. The connector initialized the README-only main baseline at b877db5a8a1f38eb717bb5418a7433ceba894cf8 and created codex/patchripple-implementation-plan from it. Fork creation is unavailable and an authorized existing fork is still required.

The GitHub connector currently reports no branches in icecold009/PatchRipple. Hosted verification cannot use a default-branch PR baseline that does not exist.

Prepared local implementation includes the trusted dist Action/CLI, pinned read-only consumer workflow, CI, fixtures and offline example. Before hosted tests, explicit authorization is required to publish feature-branch commits and initialize a minimal main baseline. Main must never receive the implementation through an unapproved direct commit or merge.

Proposed hosted work after approval:

1. Create a minimal root baseline (README describing the verification sandbox), publish it from a temporary feature branch, and initialize main through the connector. This is the sole requested main initialization, not approval to merge implementation.
2. Publish the completed implementation on codex/patchripple-implementation-plan descended from that baseline. Record immutable trusted Action commit.
3. Pin the verification workflow to that immutable Action commit. Add only the reviewed sandbox workflow/fixture to the minimal baseline if necessary for fork triggers, with approval covering those baseline files.
4. Create a same-repo test PR and an authorized fork test PR changing a fixture module, not arbitrary executable scripts. Use exact base/head objects and read-only consumer permissions. No secrets, comment writes, registry publication, deployments, or merges.
5. Inspect connector check/run/job results, download the artifact through the connector, validate exact SHAs and JS/TS + Python edges, then open it offline. Record logs/artifact identity and actual fork trust evidence.
6. Preserve the implementation PR for human review. No main merge without separate explicit approval.

The template docs/consumer-workflow.yml.example contains the exact consumer workflow except its trusted Action commit placeholder, which must be filled from the published verified commit. Do not install the placeholder literally.

Maintainer installation and three adoption trials require real participants; they are not satisfied by Codex tests. No outreach has been authorized.
