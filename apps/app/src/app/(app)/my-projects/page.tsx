import dynamic from "next/dynamic";

const PersonalProjectsPage = dynamic(
  () =>
    import("@/features/projects/personal-projects-page").then((m) => ({
      default: m.PersonalProjectsPage
    })),
  { loading: () => null }
);

export default function Page() {
  return <PersonalProjectsPage />;
}
