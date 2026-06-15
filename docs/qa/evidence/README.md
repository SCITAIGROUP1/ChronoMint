# Local QA evidence scratch (optional)

This folder documents optional local packaging. **Do not commit screenshots or videos here.**

Evidence of record lives on **GitHub issue comments** — see [EVIDENCE.md](../EVIDENCE.md).

## Optional pack (gitignored)

```bash
node .cursor/skills/kloqra-qa-workflow/scripts/archive-evidence.mjs <issue#> --env local
```

Output: `.qa-evidence/GH-<issue#>/` at repo root (gitignored).

Rename screenshots per policy:

```text
GH-<issue#>-AC-1-short-label.png
```

Then attach files to the GitHub issue comment and post sign-off.
