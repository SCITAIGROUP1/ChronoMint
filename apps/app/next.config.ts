import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./security-headers";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
});

const nextConfig: NextConfig = {
  transpilePackages: ["@kloqra/ui", "@kloqra/contracts", "@kloqra/web-shared"],
  async headers() {
    return buildSecurityHeaders({
      nodeEnv: process.env.NODE_ENV,
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL
    });
  },
  async rewrites() {
    const e2eApiTarget = process.env.E2E_API_PROXY_TARGET?.replace(/\/$/, "");
    if (!e2eApiTarget) return [];

    return [
      {
        source: "/api-proxy/:path*",
        destination: `${e2eApiTarget}/:path*`
      }
    ];
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-popover",
      "@radix-ui/react-alert-dialog",
      "motion/react",
      "react-grid-layout"
    ]
  }
};

export default withBundleAnalyzer(nextConfig);
