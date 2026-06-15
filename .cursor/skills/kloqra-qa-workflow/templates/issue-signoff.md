QA sign-off GH-<issue#> — <title>
Environment: local | staging — <URL if staging>
Tester: <name> — <YYYY-MM-DD>

| AC             | Result      | Evidence                                                       |
| -------------- | ----------- | -------------------------------------------------------------- |
| AC-1           | PASS / FAIL | command / spec name / screenshot: GH-<issue#>-AC-1-<label>.png |
| AC-2           | PASS / FAIL |                                                                |
| Regression row | PASS / FAIL | command output                                                 |

Gate: pnpm format:check && pnpm lint && typecheck && test && build — PASS / FAIL
CI: <link to PR checks or Actions run>

Screenshots: attach to this comment — naming: GH-<issue#>-AC-<n>-<label>.png
Policy: docs/qa/EVIDENCE.md

Matrix updated: all rows checked [x] on issue body.
