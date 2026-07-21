import { PermissionMatrixPage } from "@/features/account/permission-matrix/permission-matrix-page";

export const metadata = {
  title: "Permission matrix",
  description: "Inspect and configure role authorization policies across your organization."
};

export default function Page() {
  return <PermissionMatrixPage />;
}
