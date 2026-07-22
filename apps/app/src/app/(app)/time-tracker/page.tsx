import dynamic from "next/dynamic";

const UnifiedTimeTrackerPage = dynamic(
  () =>
    import("@/features/time-tracker/unified-time-tracker-page").then((m) => ({
      default: m.UnifiedTimeTrackerPage
    })),
  { loading: () => null }
);

export default function Page() {
  return <UnifiedTimeTrackerPage />;
}
