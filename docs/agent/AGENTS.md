# Kloqra agent playbook

## Delivery order

1. Read the canonical feature spec.
2. Update `packages/contracts` first when the interface changes.
3. Add failing tests.
4. Implement API behavior in `apps/api`.
5. Implement customer workflows in `apps/app` using shared packages.
6. Update documentation and `TASK_BOARD.json`.

| Role | Primary bounds                                   |
| ---- | ------------------------------------------------ |
| BA   | `docs/specs`, guides, and runbooks               |
| BE   | `apps/api/src`                                   |
| FE   | `apps/app`, `packages/ui`, `packages/web-shared` |
| QA   | tests and e2e coverage                           |
| LSA  | contracts and orchestration                      |

All customer personas use `apps/app` with auth scope `app`. `apps/platform-admin` remains isolated.

```bash
pnpm --filter @kloqra/app dev
pnpm test
pnpm test:e2e
pnpm lint
pnpm build
```
