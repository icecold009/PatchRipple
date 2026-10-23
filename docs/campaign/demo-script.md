# One-minute demo recording script

**Status:** ready-to-record script; no video has been recorded. Use the repository's fictional sample report and say so on screen.

| Time | Screen and narration |
|---|---|
| 0–7 sec | Show the sample report title and the changed-file list. Say: “PatchRipple compares exact Git revisions and surfaces possible import dependents for review.” |
| 7–17 sec | Select a changed file and show its static importer chain. Say: “Each candidate includes revision-specific import evidence, so you can inspect why it appeared.” |
| 17–27 sec | Select the related-test candidate. Say: “The report can suggest related tests from imports and naming heuristics; this is not proof of test coverage.” |
| 27–40 sec | Open warnings and analysis details. Say: “Warnings stay visible. Static analysis can be incomplete, especially in large workspaces.” |
| 40–51 sec | Show the offline HTML report and exact-revision links. Say: “The report is self-contained and opens locally. Repository links are optional.” |
| 51–60 sec | Show the fictional-data label and campaign link. Say: “This walkthrough uses fictional data. I’m looking for reviewers to challenge a report on a real public pull request.” |

Do not remove the fictional-data label, describe candidates as all affected files, or claim tests ran in the analyzed repository.
