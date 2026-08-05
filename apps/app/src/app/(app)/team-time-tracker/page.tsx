import dynamic from "next/dynamic";

const TeamTimeTrackerPage = dynamic(
  () =>
    import("@/features/time-tracker/team-time-tracker-page").then((m) => ({
      default: m.TeamTimeTrackerPage
    })),
  { loading: () => null }
);

export default function Page() {
  return <TeamTimeTrackerPage />;
}
