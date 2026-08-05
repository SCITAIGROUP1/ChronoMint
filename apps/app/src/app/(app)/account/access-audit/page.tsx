import { AccessAuditPage } from "@/features/account/access-audit/access-audit-page";

export const metadata = {
  title: "Access audit log",
  description: "A tamper-evident record of every role grant and revocation in your organization."
};

export default function Page() {
  return <AccessAuditPage />;
}
