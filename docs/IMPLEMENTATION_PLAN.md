# PatchRipple implementation plan

Prepared 2026-10-02 from the previous chat, **Finalize ChangeAtlas MVP idea**, and its PR-Impact-Map-Product-Brief.md. PatchRipple is the selected repository name. This document plans the product; it does not implement or publish it.

## Outcome and boundaries

Build an open-source, repo-local CLI and thin GitHub Action that turn a pull request into a navigable map of changed files, static import dependents, related tests, and CODEOWNERS. Produce a portable, offline HTML/JSON/SVG bundle with exact revision attribution and visible uncertainty.

Launch scope includes public JavaScript/TypeScript and Python repositories, added in that order. A JS/TS-only beta is an intermediate deliverable, not completed V1. Static impact candidates describe possible relationships, not runtime effects, test coverage, or change safety.

Exclude hosted repository analysis, databases/Supabase, accounts, AI explanations, symbol/call graphs, automatic PR comments, branch writes, and automatic publication. Workflow artifacts are authenticated downloads; anonymous permanent sharing requires owner-controlled static publication. No unconditional zero-cost promise.

## Implementation defaults

- One npm TypeScript package. Suggested layout: src/{schema,git,scan,resolve,graph,owners,tests,render,cli}, viewer/, fixtures/, tests/, docs/, action.yml, dist/.
- TypeScript compiler API for JS/TS syntax; vanilla TypeScript and SVG for the viewer, with an equivalent accessible list. No remote assets required to open a bundle.
- Proposed license: MIT. Confirm license and dependency compatibility before publishing.
- Pin the supported Node/Action runtime and dependency versions after checking current official documentation at bootstrap; commit the lockfile and verify reproducible packaging.
- Python parser selection is a bounded feasibility spike, not a proven dependency decision. Evaluate a packaged tree-sitter parser/grammar for offline loading, license, resource bounds, and Action distribution. Do not execute analyzed Python.
- Read analyzed source as inert Git blobs. Never install target dependencies, execute target scripts/config/plugins/hooks, follow symlinks/submodules, or change the analyzed checkout.

## Execution rules

Use bounded feature branches and preserve unrelated work. Never commit or merge main without explicit approval. GitHub-hosted branch/PR/check/review operations use the GitHub connector first; stop that hosted operation if permissions are unavailable.

Use bounded Jev plan reviews and complete-diff reviews, report coverage and failures, and validate concrete concerns against evidence. Under the current AGENTS instructions these reviews are advisory. Protect credentials and honor helper redaction and size limits. No commit, push, PR, package publication, or deployment is part of this planning task.

Each step below ends with its deliverable and acceptance evidence. Do not claim later steps are verified from local tests alone.

## A0 — Bootstrap and feasibility

Create package tooling, README, license proposal, and a documented supported runtime. Define scripts for lint, type checking, focused tests, build, and packaging checks. The repository currently has no source or initial commit, so scripts and versions are new choices to verify.

Perform the Python parser distribution spike early. Confirm a trusted parser/grammar can load offline in the intended Action bundle without installing anything in the analyzed repository. Record its license and loading/resource behavior. If it fails, record the Python blocker and revise the adapter choice; do not call V1 complete.

**Acceptance:** tooling builds a minimal trusted package; the parser spike has reproducible evidence or an explicit blocker. Start the JS/TS slice without hiding that blocker.

## A1 — Schema and fixtures

Write graph-schema-v1.md, machine validation, TypeScript types, and a hand-authored sample. Define:

- schemaVersion; repository identity; base tip SHA, analysis merge-base SHA, head SHA, optional PR number.
- Change records with status, old/new path, and presence in each revision.
- Stable POSIX file:path node IDs, roles, owners, revision availability, and evidence.
- Importer-to-dependency edges with revision and import kind. A renamed path is a file-level correspondence, not symbol history.
- Related-test reasons; structured warning codes and locations; completeness and enforced limits.
- Deterministically sorted semantic content. Keep generatedAt in variable run metadata.

The output contract is index.html, graph.json, graph.svg, and metadata.json. Include a tiny fixture with one changed module, two importers, a related test, and an owner, plus separate deletion, rename, cycle, unresolved-import, and partial-analysis fixtures.

**Acceptance:** fixtures validate; invalid paths, dangling edge references, and absent revisions fail validation. Add/delete/rename semantics and edge direction are documented. Fixed timestamps produce byte-stable fixture output.

## A2 — Fixture viewer

Render the hand-authored fixture before integrating parsers. Provide role/owner filtering, selection details, visible warning/completeness labels, deterministic bounded graph layout, and an equivalent searchable keyboard-friendly list. Keep isolated changed files visible. Graph omissions must show counts; the list must retain access to available information.

Source links use exact revision SHAs: deleted/base-only nodes link to base, current nodes to head. Do not generate a link to a revision where the file does not exist. Encode unusual paths safely and reject credentialed or unsafe repository URLs.

Escape HTML, SVG, Markdown, and embedded JSON independently. Test closing-script text, hostile filenames/owner values, spaces, Unicode, and newlines. The static bundle must not require a network request to load its data or assets.

**Acceptance:** a reviewer can identify the change, direct/transitive candidates, tests, owners, and uncertainty; keyboard and narrow-screen checks pass; adversarial content cannot inject markup or break data loading; bundle opens offline. Maintainer feedback is desirable and recorded separately from engineering verification.

## A3 — Git input and CLI boundary

Provide patchripple analyze --repo --base --head --out with explicit limits. Resolve refs to commits using argument arrays, no shell interpolation, and rejection of option-like input. Resolve exact SHAs before reading data.

PR comparison means merge-base(base tip, head) to head. A documented explicit direct-comparison CLI mode may compare two revisions without PR semantics. Missing/shallow history must fail with actionable guidance; never silently choose another base.

Read NUL-delimited rename-aware name-status output and both revision trees. Capture source blobs without copying .git or credentials into output. Skip symlinks/submodules and reject path traversal, absolute paths, source/output collisions, and reads outside repository bounds. Explicit trusted limits govern files, bytes, time, depth, nodes, and edges; repository config cannot increase them.

Exit 2 for invalid CLI arguments; exit 1 for fatal Git/IO/schema errors; exit 0 for a valid bundle. An incomplete valid bundle must prominently report incompleteness in JSON, viewer, and summary.

**Acceptance:** real temporary Git repositories cover divergence, missing objects, additions/deletions/renames, unusual filenames, symlinks, and hostile refs. The target working tree stays unchanged; temporary/output cleanup touches only task-owned paths.

## A4 — JS/TS extraction and resolution

Parse static ESM imports/re-exports, literal dynamic imports, and literal CommonJS require in JS/JSX/TS/TSX. Record type-only and literal-dynamic relationships distinctly from runtime claims. Expression imports produce warnings.

Resolve supported relative extensions/index paths and bounded tsconfig JSON baseUrl/paths. Do not execute config or follow external extends. Classify external packages separately. Unsupported workspace/package exports, ambiguity, aliases outside scope, and unresolved paths produce explicit warnings, not guessed edges. Configuration changes warn when broader impact cannot be inferred.

**Acceptance:** a curated syntax/resolution corpus matches expected edges and warning codes, including type imports, aliases, external packages, dynamic expressions, and unsupported configurations. Document the supported subset.

## A5 — Impact, tests, and ownership

Analyze base and head separately. Reverse-traverse head relationships for current changes and base relationships for deleted/renamed dependencies. Union candidates with revision provenance and Git-detected rename correspondence. Keep base-only candidates visibly separate from current files, with valid source links. Preserve current unresolved importers when a dependency disappears.

Traverse cycles safely and enforce depth/node/edge bounds. Report omitted work and counts without implying completeness. Related tests come from importing test files and documented naming rules; show the reason and never call it test coverage.

Use base-revision CODEOWNERS as review authority. Define precedence .github/CODEOWNERS, root CODEOWNERS, then docs/CODEOWNERS; last matching supported rule wins. Document and fixture-test the supported pattern subset, warning for unsupported syntax. No GitHub team expansion or API lookup.

**Acceptance:** cycles, diamonds, deletions/renames, obsolete importers, base-only candidates, ambiguous tests/owners, and truncation have expected results. Same revisions and config produce identical semantic output.

## A6 — Local end-to-end slice

Wire Git input, parser, impact enrichment, schema validation, renderer, and CLI. Add help/version and documented language/limit diagnostics. Treat the analyzed repository as data throughout.

**Acceptance:** a golden Git fixture produces all four output files; output validates and opens offline; repeated normalized output is identical; the analyzed checkout remains unchanged. Record representative benchmark machine, file count, elapsed time, memory, and limits before making scale claims.

## B1 — Trusted Action and hosted verification

Add action.yml and a self-contained trusted dist bundle. Maintainer CI builds/tests PatchRipple and verifies source/dist consistency; that CI is distinct from the consumer analysis workflow. Verify current runner/runtime and official checkout/upload compatibility, then pin trusted references.

The consumer workflow uses pull_request, contents: read, and exact base tip/head SHAs rather than an accidental synthetic merge SHA. Fetch and verify required history. Fork heads may need the base repository's PR ref; test reachability instead of assuming the SHA is available. Set persist-credentials: false. Do not use pull_request_target, secrets, write permissions, analyzed-project installs/builds/tests, or untrusted executable config.

The analyzer and parser assets must come from the pinned trusted Action, never from PR-controlled files. Do not interpolate event fields into shell commands. Emit bundle path/counts/warnings and an escaped bounded GITHUB_STEP_SUMMARY. Upload only owned generated output with a separate trusted artifact step. No comment, push, or deployment behavior.

**Acceptance:** an explicitly authorized public sandbox same-repo PR and fork PR produce correct exact-SHA summaries and downloadable artifacts with read permissions and no target-code execution. Download/view the bundle; test hostile summary strings and missing history. Local fixtures alone do not prove hosted behavior. Connector permission gaps remain explicit hosted-evidence blockers.

## B2 — Python adapter

After the JS/TS local and Action slices, implement the parser proven in A0. Parse static import/from forms, relative levels, __init__, and explicit safe project source roots. Resolve repository-local modules only under the documented rules. Classify external dependencies and warn for dynamic imports, namespace ambiguity, unresolved relationships, symlinks, and unsupported syntax.

Reuse the schema, traversal, test-reason, rendering, and bounds contracts; do not rewrite the viewer for language-specific data.

**Acceptance:** fixtures cover relative/import/from/package-init/source-root/mixed-repository cases and uncertainty. Golden outputs are repeatable. Verify packaged offline parser loading locally and the actual bundled Action with a Python fixture. Missing parser or hosted evidence is an explicit V1 blocker.

## B3 — Documentation and static demo

Write installation and pinned Action guidance, CLI usage, SHA semantics, permissions, trust boundary, supported syntax/resolution, base-authoritative CODEOWNERS subset, test heuristics, schema, warnings/limits/exit codes, and troubleshooting. Explain that output reveals filenames and owners even though it does not contain the complete source tree.

Explain artifact authentication/retention and owner-controlled permanent publication. Build static docs and a synthetic offline example locally. Cloudflare Pages publication is a separate authorized step; verify current provider terms before any free-tier claim. No registry, Marketplace, or deployment action belongs to this planning task.

**Acceptance:** a maintainer follows the guide in the authorized sandbox, understands incomplete results and artifact access, and can open the demo. Record observed evidence instead of treating written instructions as proof.

## B4 — Release and adoption evidence

Engineering V1 readiness requires JS/TS and Python adapter evidence, offline/accessibility checks, hostile-input and graph regressions, deterministic packaging, source/dist consistency, actual same-repo/fork Action evidence, and finalized license. Keep an evidence checklist with exact refs, commands/results, and unresolved blockers.

Three public-repository maintainer trials are an adoption objective separate from technical readiness. Record whether the map informs review and which edges are missed or misleading. Missing trials mean adoption is unvalidated; do not invent approval. Reconsider expansion only after useful review behavior and limitations are understood.

Publishing, package release, deployment, and merging require separate authorization. No runtime-impact or change-safety guarantees.

## First implementation package

Start A0–A1 only: tooling, dependency/parser feasibility notes, schema contract, and tiny fixture. Stop that package at a reviewable diff with schema/fixture evidence. Next build the fixture viewer, then Git and analyzer steps. Do not attempt the entire roadmap in one change.

## Jev review record

All reviews used the exact PatchRipple repository; it initially had no files or HEAD. The initial broad payload exceeded the plan tool's 12,000-character limit and did not complete review. No model/usage receipt is claimed for that rejected call.

The revised plan was reviewed as two bounded inline batches with no repository-file evidence:

- Batch A, contracts/viewer/Git/JS-TS/local slice: jev-1.13.0, typed outcome ready, gate pause_for_user_decision, confidence 0.28; usage 1,892 input / 156 output tokens.
- Batch B, trusted Action/Python/docs/release: jev-1.13.0, typed outcome revise_plan, gate revise_plan_before_changes, confidence 0.30; usage 1,774 input / 158 output tokens.

Both raised assumption/sequencing signals without concrete textual findings. This final plan states feasibility checks, supported subsets, trusted-code boundaries, hosted evidence gates, and adoption uncertainty explicitly. It is a Codex implementation proposal reviewed by Jev, not unqualified Jev approval or proof of future product behavior. The final document diff receives a separate review; its result is reported in the task response.
