import { describe, expect, it } from "vitest";
import {
  REQUIRE_PERMISSION_KEY,
  type RequiredPermissionMetadata
} from "../../../../common/decorators/require-permission.decorator";
import { SubscriptionBillingController } from "./subscription-billing.controller";
import { SubscriptionSalesInquiryController } from "./subscription-sales-inquiry.controller";

const permission = (controller: { prototype: any }, method: string): RequiredPermissionMetadata =>
  Reflect.getMetadata(REQUIRE_PERMISSION_KEY, controller.prototype[method] as object);

describe("subscription canonical route authorization", () => {
  it("separates core billing from sales inquiry management", () => {
    expect(permission(SubscriptionBillingController, "changePlan").permission).toBe(
      "tenant:ManageBilling"
    );
    expect(permission(SubscriptionBillingController, "createCheckout").permission).toBe(
      "tenant:ManageBilling"
    );
    expect(permission(SubscriptionSalesInquiryController, "create").permission).toBe(
      "tenant:ManageSalesInquiry"
    );
    expect(permission(SubscriptionSalesInquiryController, "uploadReceipt").permission).toBe(
      "tenant:ManageSalesInquiry"
    );
  });

  it("binds billing decisions to the session tenant", () => {
    expect(permission(SubscriptionBillingController, "createPortal").resolver).toEqual({
      scope: "tenant",
      tenantId: { source: "session", field: "tenantId" }
    });
  });
});
