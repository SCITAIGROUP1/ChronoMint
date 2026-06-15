# Dev → QA handoff comment (paste on issue)

Dev or tech lead posts this when moving a card to **`ready-for-qa`**. Non-technical QA can start at **`testing`** without Terminal.

```text
## Ready for QA

**Environment:** staging
**Client:** https://kloqra-client-staging.vercel.app
**Admin:** https://kloqra-admin-staging.vercel.app
**Login:** member@kloqra.dev / password123 (client) · admin@kloqra.dev / password123 (admin)

**Automated:** CI green on PR #___ — dev verified, QA does not need to run Terminal.

**Manual checklist for QA** (from issue matrix):
- AC-1: …
- AC-2: …
- AC-3: …

**What changed:** one sentence for the tester.

**Out of scope:** do not test billing / invoice / client portal.

@<qa-tester> — please follow [QA simple guide](../QA_SIMPLE_GUIDE.md)
```
