import { redirect } from "next/navigation";
import { BillingPage } from "@/features/billing/billing-page";
import { isCommercialFeaturesEnabled } from "@/lib/commercial-features";

export default function Page() {
  if (!isCommercialFeaturesEnabled()) {
    redirect("/dashboard");
  }
  return <BillingPage />;
}
