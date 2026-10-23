# PatchRipple two-week trial campaign

**Campaign window:** 23 October–5 November 2026 (Asia/Kolkata)

**Goal:** three completed external trials

**Working state (23 October):** focused issues [#8](https://github.com/icecold009/PatchRipple/issues/8), [#9](https://github.com/icecold009/PatchRipple/issues/9), and [#10](https://github.com/icecold009/PatchRipple/issues/10) are published and linked from the updated [central invitation #3](https://github.com/icecold009/PatchRipple/issues/3). The 15-person screen and six individual invitation drafts are ready. No individual invitation or social post has been published, and no participant trial has begun.

## What counts as a completed trial

A trial counts when a distinct external reviewer installs the pinned PatchRipple candidate, runs it on a real public pull request, opens the offline report, and provides feedback on expected, observed, missed, and misleading candidates, warning clarity, and any change to review focus. A report critique without installation is recorded separately. Do not count self-analysis, sample fixtures, or a prepared report as a participant trial.

Use the existing [maintainer trial template](../MAINTAINER_TRIAL_TEMPLATE.csv) to record exact tool, base, and head revisions. Ask permission before retaining attributable feedback.

## Evidence to keep in the copy

- The exact tested install candidate is commit d12fd77960e72112832aedd139a8b51cde00d058. Its archive installed in an isolated npm prefix and its version/help commands succeeded. It is an unmerged pre-release candidate; there is no versioned release or public npm package.
- The walkthrough and offline example report use fictional repository names and SHAs. They demonstrate the interface, not a real trial.
- The developer-run Vitest workspace comparison remains incomplete: it reached the 500-node and 2,000-edge caps and retained 830 unresolved workspace imports after the resolver improvement. Treat the workspace trial as exploratory.
- Existing real-repository comparisons are developer-run evidence, not independent participant trials or broad accuracy results. See [release evidence](../RELEASE_EVIDENCE.md) and [sample comparisons](../REAL_REPOSITORY_SAMPLES.md).
- Issue #3 already has three unanswered group-invitation comments. The first wave is individually tailored and excludes those nine previously invited people.

## Schedule

| Days | Dates | Work |
|---|---|---|
| 1–2 | 23–24 Oct | Prepare the three issue bodies, one synthetic example report link, the one-minute demo script, and a 15-person prospect screen. |
| 3–5 | 25–27 Oct | Send six individual invitations through PatchRipple’s own Issue #3; publish one post only in the current r/devops weekly self-promotion thread after checking it is still open and permits projects. |
| 6–9 | 28–31 Oct | Run participant trials; record installation and comprehension problems before changing product copy or behavior. |
| 10–14 | 1–5 Nov | Make one appropriate follow-up after seven days. Approach up to six more prospects only if the first batch gives a reason to continue. Publish a walkthrough only after checking its claims and destination links. |

The campaign starts on the date above. Do not interpret elapsed time as a reply or as permission to follow up.

## Channel decisions

- **r/devops:** prepare a comment for its weekly self-promotion thread. Recheck the current thread on the posting day; the current thread is time-sensitive.
- **LinkedIn:** prepare a profile post with the synthetic preview and one separately identified observed relationship.
- **Show HN:** hold until the repository and exact-SHA install path are directly tryable from the post and the limitations are clear. Show HN is for something readers can try; it is not a place to solicit votes.
- **DEV:** removed from this product-promotion campaign. DEV’s current AI-assisted article guidance says AI-assisted articles should not promote the author’s own business or program. Do not adapt the promotional copy into a DEV article.
- **Other projects:** do not open promotional issues or leave promotional comments on prospects’ pull requests. Contact prospects individually from PatchRipple Issue #3. Contribute on another project only when a source-checked finding directly helps its existing discussion.

## Files in this campaign kit

- issues/01-js-ts.md, issues/02-python.md, and issues/03-workspace.md mirror the published trial issue bodies (#8–#10).
- channels.md contains draft social copy and launch checks.
- demo-script.md is a one-minute recording script; it is not a completed video.
- metrics.csv records the three published issues, 15 screened prospects, and current outreach, post, reply, install, and trial counts.

The prospect screen and individualized invitation drafts are kept in a separate local planning file, not in this repository campaign kit.

## Source links

- [PatchRipple Issue #3](https://github.com/icecold009/PatchRipple/issues/3)
- [Tested pre-release candidate and exact install evidence](../RELEASE_EVIDENCE.md)
- [Repository sample boundaries](../REAL_REPOSITORY_SAMPLES.md)
- [Show HN guidelines](https://news.ycombinator.com/showhn.html)
- [DEV AI-assisted article guidelines](https://dev.to/guidelines-for-ai-assisted-articles-on-dev)
