# PatchRipple

See what a pull request may affect. PatchRipple analyzes Git blobs inside your chosen environment and produces an offline map of changed files, static import dependents, related tests and base-revision CODEOWNERS.

**Static candidates are possibilities, not runtime effects, coverage, or proof that a change is safe.** Warnings and omissions remain visible. No target code, scripts, executable configuration, project installs, or network analyzer runs.

## Local development

Node 24 and Git are required. In this trusted PatchRipple checkout:

```sh
npm ci --ignore-scripts
npm run verify
node dist/cli.cjs --help
```

This installs PatchRipple's development dependencies only, never dependencies from an analyzed repository. The build produces trusted self-contained CLI/Action code, Python WASM assets and schema. No npm install is needed inside the repository being analyzed.

## Analyze a comparison

```sh
node /path/to/PatchRipple/dist/cli.cjs analyze \
  --repo /path/to/target \
  --base BASE_COMMIT --head HEAD_COMMIT \
  --repository https://github.com/owner/repo \
  --out /path/to/new-bundle
```

The output must be a **new directory outside the analyzed repository**. Existing paths are refused. PR mode computes merge-base(base tip, head) to head; explicit `--mode direct` compares exactly two commits. Missing objects/history fail with guidance; fetch them before analysis. The target working tree stays untouched.

Outputs: `index.html`, `graph.json`, `graph.svg`, `metadata.json`. Open index.html locally; it has no external assets or fetch requests. Generated time is separate from deterministically sorted graph semantics.

Exit codes: 0 valid output (possibly visibly incomplete), 1 fatal Git/IO/schema failure, 2 invalid command arguments. Never interpret exit 0 alone as complete analysis or safe change.

## GitHub Action

Use [the consumer workflow template](docs/consumer-workflow.yml.example). Replace PATCHRIPPLE_COMMIT with a reviewed published immutable Action commit before installing. It uses Node 24; self-hosted runners must support Node24 Actions and the pinned checkout runtime. The analyzer ships in dist; do not rebuild/install it from the target PR.

The workflow uses pull_request and read-only contents permission. It fetches the base repository's PR head ref, verifies exact base/head objects, and never executes target scripts. Do not use pull_request_target, write tokens, secrets, merge-SHA substitution, PR comments, or deployment in the analysis workflow.

Workflow artifacts require GitHub sign-in and repository read access to download and have configured retention. For an anonymous permanent map, the owner publishes the static bundle separately. Output reveals repository paths and owners; review data before public publication.

## Supported scope and uncertainty

- JS/JSX/TS/TSX/MJS/CJS/MTS/CTS: literal imports, re-exports, type imports, dynamic literal imports and require. Dynamic expressions and parse errors warn.
- Relative extension/index resolution and bounded root tsconfig JSON paths/baseUrl. Emitted .js/.jsx paths substitute TS/TSX/declarations; .mjs/.cjs require explicit extensions. Aliases use exact matches before the longest wildcard prefix. Executable config and extends are never loaded. Package/workspace relationships and directory package metadata are excluded with visible warnings.
- Python: static import/from, relative levels, existing package initializers and explicit source roots (default root and src). Dynamic/wildcard imports, namespace ambiguity, unsupported syntax and unresolved/external modules warn. Set `--python-roots .,src` explicitly for your layout.
- Both base/head graphs contribute impact. Removed files and old rename paths keep base attribution and links.
- Tests use importing test files and documented adjacent/naming conventions; testReasons describe heuristic evidence.
- Base CODEOWNERS precedence .github, root, docs; last matching supported rule. Supported subset: directory patterns, *, **, ?, @user/@team and email owners; negative patterns, character classes, escapes and malformed rules warn. No team membership lookup.
- Symlinks/submodules, binaries, unsupported source languages and limits warn. Any warning or known omission marks analysis incomplete.

Default hard ceilings per revision: 5,000 files, 40 MiB aggregate source, 512 KiB/file; displayed candidates 500 nodes/2,000 edges/depth 20; analysis Git/parsing deadline 60 seconds. CLI limits can reduce these ceilings, never raise them. The diagram shows at most 80 nodes; the searchable full list retains the remaining included candidates. Omitted counts describe encountered candidates, not undiscovered descendants.

## Verification and release

`npm test` exercises real temporary Git histories, parser fixtures, deletion/rename attribution, bounds, output collisions, malformed data, escaping and deterministic output. `npm run demo` builds a synthetic offline example. The implementation plan and [release evidence](docs/RELEASE_EVIDENCE.md) distinguish passing local checks from missing hosted/browser/adoption evidence.

MIT licensed. Third-party assets retain their own licenses in dist/THIRD_PARTY_NOTICES.txt. No registry publication, deployment, automatic writes, hosted analysis service or unconditional free-tier promise.
