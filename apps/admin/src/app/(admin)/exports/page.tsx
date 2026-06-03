import dynamic from "next/dynamic";

const ExportsPage = dynamic(
  () => import("@/features/exports/exports-page").then((m) => ({ default: m.ExportsPage })),
  {
    loading: () => (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }
);

export default function Page() {
  return <ExportsPage />;
}
