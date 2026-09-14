/**
 * Commercial features UI: hourly rates, revenue amounts, invoices, project hour budgets.
 * Does NOT gate SaaS subscription billing or TimeLog/Task billable flags.
 *
 * Default ON. Set NEXT_PUBLIC_CLIENT_COMMERCIAL_FEATURES=false for UAT (pair with API).
 */
export {
  COMMERCIAL_ACCOUNT_WIDGET_IDS,
  COMMERCIAL_DASHBOARD_WIDGET_IDS,
  isClientCommercialFeaturesEnabled as isCommercialFeaturesEnabled
} from "@kloqra/web-shared";
