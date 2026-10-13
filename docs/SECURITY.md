# Security boundaries

Repository source is untrusted inert data read from exact Git objects with bounded subprocess output, file sizes and analysis time. Git commands use argument arrays and avoid external diff/textconv, optional locks, replacement objects and fsmonitor. Analysis does not execute target code/configuration, install dependencies, switch branches, traverse symlinks/submodules, or call a hosted analysis API.

History retrieval is a separate, explicit user-run Git command documented in the README. It contacts the configured remote and writes fetched objects plus refs under `refs/patchripple/manual/`; it does not change the checked-out branch or working tree. The command sets `core.hooksPath=/dev/null` and disables recursive submodules. As with any Git fetch, Git may use the local repository's transport and authentication settings. Users should inspect `git remote -v` before fetching. `doctor` remains read-only.

Trusted workflow inputs set ceilings; repository data cannot increase them. Output goes only to a new directory outside the analyzed repository. Source links require an uncredentialed HTTPS github.com repository URL and validated exact SHAs; all path segments are encoded. Viewer uses context-specific escaping, DOM textContent and hashed inline CSP with no network connections.

The consumer must run immutable trusted Action code, with pull_request and contents: read, and fetch exact base/head objects. Never use pull_request_target or secrets to process untrusted PR data. Maintainer CI that builds trusted PatchRipple source is separate from consumer analysis. Artifacts expose paths, ownership and relationships; the owner decides whether to publish them.

Parser limitations are visible uncertainty rather than safety guarantees. Git object reads and syntax parsing can still consume resources up to configured limits. Offline Python uses the pinned packaged grammar, not target Python execution.

Report reproducible issues privately to the repository maintainer; do not place credentials or private target source into public reports.
