export function ChartSkeleton({ className = "min-h-[280px]" }: { className?: string }) {
  return <div className={`w-full animate-pulse rounded-md bg-muted ${className}`} />;
}
