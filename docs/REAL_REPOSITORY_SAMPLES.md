# Bounded real-repository samples

**Collected: 2026-10-13.** This record adds three exact-revision samples to the PR #6 and `sindresorhus/p-limit#109` analyses in [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md). The three PRs were chosen as focused Python and JavaScript changes with identifiable source modules and import relationships. This is a developer-run evidence sample, not a random or representative benchmark, maintainer trial, or measure of runtime impact.

## Method

The GitHub connector confirmed each PR's merged state, exact base and head SHAs, changed paths, and patch. Only those commits were fetched into disposable temporary Git repositories. PatchRipple ran in `direct` mode against the exact SHAs. No target code, configuration, hooks, tests, or dependencies were executed. Changed-file patches and source import statements at the PR head were independently inspected and compared with the report's direct importer edges. Warning counts below include both base and head revisions. A graph marked incomplete remains incomplete even when no nodes or edges were omitted. The Express sample was rerun with the root-directory resolver fix and rebuilt CLI.

## Results

| Public PR | Exact base → head | Changed paths; report | Warnings and completeness |
| --- | --- | --- | --- |
| [pallets/flask#6096](https://github.com/pallets/flask/pull/6096) | `514fc6b3e8402e4c646d5284e97a4f0ab50a7c4b` → `7203feabf723edae0286ae5dc64fec8ac4c91735` | 4 changed paths; 72 candidates, 388 edges | 588 warnings: 574 expected external imports, 10 binary exclusions, 4 dynamic/invalid-syntax warnings; incomplete, 0 omitted nodes/edges |
| [pypa/packaging#1446](https://github.com/pypa/packaging/pull/1446) | `332d716676eb934b67ede4054a3e3e0d4022b2d3` → `a4f5d377a62e96759a4d9237256ec5dc3b19444e` | 2 changed paths; 3 candidates, 4 edges | 624 warnings: 592 expected external imports, 28 binary exclusions, 2 dynamic/invalid-syntax warnings, 2 unsupported-language warnings; incomplete, 0 omitted nodes/edges |
| [expressjs/express#7366](https://github.com/expressjs/express/pull/7366) | `ba006766fb964571723138708eacaba0f55759cd` → `7bf8671d13b83cec863568e68989df2c2d6084cf` | 3 changed paths; 120 candidates, 242 edges | 314 warnings: 308 expected external imports, 6 dynamic/invalid-syntax warnings; incomplete, 0 omitted nodes/edges |

At each PR head, independent source inspection corroborated the following direct importers. PatchRipple reported the same direct-edge counts on the base and head revisions:

- **Flask:** `src/flask/app.py` had six importer files: `src/flask/__init__.py`, `src/flask/cli.py`, `src/flask/ctx.py`, `src/flask/globals.py`, `src/flask/sessions.py`, and `src/flask/testing.py`. `src/flask/testing.py` had eight: `src/flask/app.py`, `src/flask/sansio/app.py`, `tests/test_appctx.py`, `tests/test_basic.py`, `tests/test_reqctx.py`, `tests/test_request.py`, `tests/test_testing.py`, and `tests/test_views.py`.
- **Packaging:** the changed `src/packaging/pylock.py` was imported by `tests/test_pylock.py` and `tests/test_pylock_select.py`.
- **Express:** the changed `lib/request.js` was imported by `lib/express.js`. The public entry chain `index.js` → `lib/express.js` → `lib/request.js` was present; the changed `test/req.fresh.js` imported the public entry point.

These checks corroborated 17 direct importer-to-changed-source relationships. The first Express run exposed a resolver defect: valid relative imports of the repository root were normalized to `./` and rejected, leaving only 8 candidates and 10 edges while reporting 192 unresolved imports. The resolver now normalizes the root to the empty repository path, consults the root package entry, and falls back to root `index.*`; a focused regression covers `../`, `../../`, package `main`, and index fallback. The rebuilt CLI then reported 120 candidates and 242 edges for the same exact revisions with no unresolved-import warnings. The graph remains incomplete because of 308 expected-external and 6 dynamic/invalid-syntax warnings. These checks do not score all candidates, establish precision/recall, or determine which files matter to a real review.

## Reproduction

Use Node.js 24 or newer and a built PatchRipple checkout. For each row, create a new empty temporary directory, initialize it as a Git repository, and fetch the exact base and head commits from the public repository. Then run:

```sh
node dist/cli.cjs analyze --repo PATH --base BASE_SHA --head HEAD_SHA --repository https://github.com/OWNER/REPO --mode direct --out NEW_PATH
```

Keep `NEW_PATH` outside `PATH`. The command reads the fetched Git objects; it does not check out or execute target-repository code.

## Evidence boundary

These three samples strengthen the developer-run evidence set, but broad real-repository accuracy remains unestablished. They do not count as maintainer installation or review trials. They also provide no screen-reader, physical-device, fork-artifact, or versioned-release evidence.
