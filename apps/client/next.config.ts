import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
});

const nextConfig: NextConfig = {
  transpilePackages: ["@kloqra/ui", "@kloqra/contracts", "@kloqra/web-shared"],
  experimental: {
    optimizePackageImports: ["lucide-react"]
  }
};

export default withBundleAnalyzer(nextConfig);
