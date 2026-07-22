import dynamic from "next/dynamic";

const UnifiedDashboardPage = dynamic(
  () =>
    import("@/features/dashboard/unified-dashboard-page").then((module) => ({
      default: module.UnifiedDashboardPage
    })),
  { loading: () => null }
);

export default function Page() {
  return <UnifiedDashboardPage />;
}
