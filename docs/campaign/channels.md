# Promotion copy drafts

All copy is unpublished. Recheck destination rules and links on the day of posting.

## r/devops weekly self-promotion thread

Post only in the current weekly thread and confirm that it still welcomes project posts. The current thread was checked on 23 October 2026; use the thread that is current on the planned posting date.

**Image:** attach docs/demo/preview.gif. It uses fictional sample data.

> PatchRipple is an offline CLI/Action that maps static import dependents, related-test candidates, and base-revision CODEOWNERS for a pull request.
>
> In a developer-run comparison of sindresorhus/p-limit #109, the report found the test file importing the changed index module. Static candidates are review hints; they do not prove runtime impact or test coverage. The report also shows warnings and can be incomplete.
>
> The attached preview uses fictional data. I’m looking for three reviewers willing to challenge a report on a real public PR. If you share a PR link, I can prepare a report before asking you to install anything.
>
> Project and tested pre-release install instructions: https://github.com/icecold009/PatchRipple/tree/d12fd77960e72112832aedd139a8b51cde00d058

Do not use a stale weekly-thread URL. Do not ask for votes or endorsements.

## LinkedIn profile post

> A static import map is a review aid, not a safety verdict.
>
> PatchRipple compares exact Git revisions and lists possible import dependents, related-test candidates, and base-revision CODEOWNERS in an offline report. A developer-run p-limit comparison found a test importer for a changed index module; a separate Vitest workspace run still hit graph limits and remained incomplete.
>
> I’m recruiting three people to challenge the output on a real public PR: one useful candidate, one miss, one misleading result. I can prepare the first report before anyone installs the tool.
>
> The preview uses fictional data. The current tested install is an unreleased, pinned source candidate: https://github.com/icecold009/PatchRipple/tree/d12fd77960e72112832aedd139a8b51cde00d058

Attach docs/demo/preview.gif and retain the fictional-data label. No post has been published.

## Show HN

**Proposed title:** Show HN: PatchRipple – offline import-impact maps for pull requests

> PatchRipple is a local CLI and read-only GitHub Action that compares exact revisions and produces an offline report of static import dependents, related-test candidates, CODEOWNERS, and uncertainty. It does not run the target repository's code or configuration.
>
> Try the pinned pre-release from the repository instructions with Node.js 24 or newer. There is no hosted analyzer, sign-up, or npm release. The example report is downloadable and uses fictional repository data.
>
> The output is a review aid, not runtime impact, test coverage, or proof that a change is safe. Workspace-heavy analysis can remain incomplete at built-in graph limits; the documentation records a real Vitest stress sample and its warnings.
>
> Repository: https://github.com/icecold009/PatchRipple/tree/d12fd77960e72112832aedd139a8b51cde00d058

**Launch check:** open the repository and exact-SHA install path from a clean browser session and confirm the example report can be downloaded and opened. Show HN guidelines require something readers can try; they do not permit asking friends to vote or comment. If the try path fails, do not submit.

## DEV

Do not use DEV for this product-promotion campaign. Its current [AI-assisted article guidance](https://dev.to/guidelines-for-ai-assisted-articles-on-dev) says AI-assisted articles should not promote the author's own business or program. A future, human-authored article would need to be genuinely non-promotional and checked against the current rules.
