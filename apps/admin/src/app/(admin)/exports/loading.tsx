export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
      <div className="h-48 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
