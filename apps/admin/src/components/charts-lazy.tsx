"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "./chart-skeleton";

export const ReportVisualsSection = dynamic(
  () => import("./report-charts").then((m) => ({ default: m.ReportVisualsSection })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const DashboardExtraCharts = dynamic(
  () => import("./dashboard-extra-charts").then((m) => ({ default: m.DashboardExtraCharts })),
  { ssr: false, loading: () => <ChartSkeleton className="min-h-[260px]" /> }
);
