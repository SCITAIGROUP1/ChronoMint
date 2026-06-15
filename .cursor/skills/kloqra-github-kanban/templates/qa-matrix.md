## QA verification matrix

| AC   | Type       | Automated test / command                             | Manual steps (QA checks)  | Pass |
| ---- | ---------- | ---------------------------------------------------- | ------------------------- | ---- |
| AC-1 | E2E        | `pnpm --filter @kloqra/client test:e2e --grep "..."` | 1. Login seed member 2. … | [ ]  |
| AC-2 | API        | `apps/api/test/<module>.e2e.ts`                      | curl / Swagger            | [ ]  |
| AC-3 | Unit       | `path/to/*.spec.ts`                                  | Error path in UI          | [ ]  |
| —    | Regression | `pnpm test -- <paths>`                               | Related suite green       | [ ]  |

**QA sign-off (fill at testing → done):**

```
QA sign-off GH-<issue>:
- AC-1: PASS — evidence:
- AC-2: PASS — evidence:
- Gate: pnpm format:check && lint && typecheck && test && build PASS
```
