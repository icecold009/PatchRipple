## Try PatchRipple on a shared JavaScript or TypeScript change

PatchRipple is a pre-release offline CLI and GitHub Action that compares exact Git revisions and lists static JavaScript/TypeScript/Python import dependents, related-test candidates, and base-revision CODEOWNERS. The report shows warnings and analysis limits. Its candidates are review hints, not proof of runtime impact, test coverage, or safety. The analyzer does not execute code, scripts, or configuration from the repository being reviewed.

### Example report

Download the [synthetic offline example report](https://github.com/icecold009/PatchRipple/blob/d12fd77960e72112832aedd139a8b51cde00d058/docs/demo/index.html) and open the saved HTML file in a browser. Its repository names and commit SHAs are fictional; it is a UI example, not a real pull-request result.

### Trial task

Choose one public pull request that changes a shared JavaScript or TypeScript module, package entry, or export. Compare PatchRipple’s suggested importers and test candidates with what you expected to inspect in the review. Please report:

- one useful candidate it found;
- one expected relationship it missed;
- one candidate that was misleading;
- whether warning clarity and the report changed your review focus; and
- whether installation and offline report opening worked.

If you prefer, nominate another public pull request and I can prepare a report first. A report critique is useful and does not count as an install trial.

### Tested install command

This exact archive and CLI version/help check were tested on the following code-bearing commit. It is a pre-release candidate, not a versioned release; no npm package is published.

~~~sh
npm install --global --ignore-scripts --no-audit --no-fund "https://github.com/icecold009/PatchRipple/archive/d12fd77960e72112832aedd139a8b51cde00d058.tar.gz"
patchripple --version
~~~

Node.js 24 or newer and npm are required. For a public pull request, the documented flow is fetch-pr, doctor, then analyze; see the [pinned README quick start](https://github.com/icecold009/PatchRipple/blob/d12fd77960e72112832aedd139a8b51cde00d058/README.md#quick-start).

Please use only a public repository for this trial. Do not send private code or credentials. If you share attributable feedback, first confirm that it may be retained. No endorsement or adoption is requested.
