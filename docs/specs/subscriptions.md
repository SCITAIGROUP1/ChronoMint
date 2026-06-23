# Subscriptions — Stripe integration & lifecycle

SaaS-F11–F13: paid plans via Stripe Checkout, webhooks, subscription write-guards, and Account billing UX.

## API routes

| Route                         | Method | Role  | Purpose                                  |
| ----------------------------- | ------ | ----- | ---------------------------------------- |
| `ROUTES.TENANTS.SUBSCRIPTION` | GET    | OWNER | Current plan, limits, `billingAlert`     |
| `ROUTES.TENANTS.CHECKOUT`     | POST   | OWNER | Stripe Checkout Session (`{ planSlug }`) |
| `ROUTES.TENANTS.PORTAL`       | POST   | OWNER | Stripe Customer Portal session           |
| `ROUTES.WEBHOOKS.STRIPE`      | POST   | —     | Stripe webhook ingestion (raw body)      |

## Subscription statuses

`trial` · `active` · `past_due` · `suspended` · `canceled`

- **Write block (F12):** `past_due`, `suspended`, `canceled` → `402 PAYMENT_REQUIRED` on timer start, timelog create/batch.
- **Allowed:** timer stop, GET/export, workspace read.
- **Grace:** `invoice.payment_failed` → `past_due` immediately (0-day). Cron suspends after 7 days `past_due`.

## Webhooks (minimum)

| Event                           | Action                                          |
| ------------------------------- | ----------------------------------------------- |
| `checkout.session.completed`    | Link Stripe customer/subscription; set `active` |
| `customer.subscription.updated` | Sync status, period end, plan from price        |
| `customer.subscription.deleted` | Set `canceled`                                  |
| `invoice.payment_failed`        | Set `past_due`; email tenant owner              |

Idempotency: `stripe_webhook_events` table keyed by Stripe event id.

## Environment

| Variable                | Required        | Notes                                                |
| ----------------------- | --------------- | ---------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | Prod / checkout | Test mode `sk_test_…`                                |
| `STRIPE_WEBHOOK_SECRET` | Prod / webhooks | From Stripe CLI or Dashboard                         |
| `STRIPE_PRICE_STARTER`  | Optional        | Overrides seed price id                              |
| `STRIPE_PRICE_PRO`      | Optional        | Overrides seed price id                              |
| `PUBLIC_ADMIN_URL`      | Recommended     | Checkout success/cancel URLs and billing email links |

### Local webhooks

```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
```

Set `STRIPE_WEBHOOK_SECRET` to the CLI signing secret.

## Billing alerts

`GET TENANTS.SUBSCRIPTION` returns `billingAlert`:

- `past_due` — payment failed or suspended billing state
- `trial_ending` — trial ends within 7 days
- `null` — no alert

Admin shell shows a global banner for tenant owners when `billingAlert` is set.

## Tests

- Unit: `subscription-sync.service.spec.ts`, `stripe-webhook.service.spec.ts`, `subscriptions.service.spec.ts`
- E2E: `stripe-webhook.e2e.ts`, `subscription-lifecycle.e2e.ts`
- Playwright: `apps/admin/e2e/account-billing.spec.ts`
