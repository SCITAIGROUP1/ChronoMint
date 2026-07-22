import { PermissionMatrixPage } from "@/features/account/permission-matrix/permission-matrix-page";

export const metadata = {
  title: "Permission Studio",
  description: "Review and configure authoritative role and member permission policy."
};

export default function Page() {
  return <PermissionMatrixPage />;
}
