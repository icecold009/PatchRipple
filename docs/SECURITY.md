# Security boundaries

Repository source is untrusted inert data read from exact Git objects with bounded subprocess output, file sizes and analysis time. Git commands use argument arrays and avoid external diff/textconv, optional locks, replacement objects and fsmonitor. Analysis does not execute target code/configuration, install dependencies, switch branches, traverse symlinks/submodules, or call a hosted analysis API.

History retrieval is a separate, explicit user-run operation. `fetch-pr` accepts a public GitHub `OWNER/REPO`, base branch, and PR number. It constructs a fixed HTTPS URL, rejects local Git URL rewrite rules, disables system/global Git config, credential helpers, extra HTTP headers, hooks, tags, and recursive submodules, then atomically writes only `refs/patchripple/manual/base` and `refs/patchripple/manual/head`. It downloads Git objects without changing the checked-out branch or working tree and never checks out or executes target code/configuration. Private repositories are not supported by this command. For private or non-GitHub repositories, a maintainer must use a trusted manual fetch procedure and inspect its URL and authentication behavior. `doctor` remains read-only.

Trusted workflow inputs set ceilings; repository data cannot increase them. Output goes only to a new directory outside the analyzed repository. Source links require an uncredentialed HTTPS github.com repository URL and validated exact SHAs; all path segments are encoded. Viewer uses context-specific escaping, DOM textContent and hashed inline CSP with no network connections.

The consumer must run immutable trusted Action code, with pull_request and contents: read, and fetch exact base/head objects. Never use pull_request_target or secrets to process untrusted PR data. Maintainer CI that builds trusted PatchRipple source is separate from consumer analysis. Artifacts expose paths, ownership and relationships; the owner decides whether to publish them.

Parser limitations are visible uncertainty rather than safety guarantees. Git object reads and syntax parsing can still consume resources up to configured limits. Offline Python uses the pinned packaged grammar, not target Python execution.

Report reproducible issues privately to the repository maintainer; do not place credentials or private target source into public reports.
