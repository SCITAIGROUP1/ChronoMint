import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true"
});

const nextConfig: NextConfig = {
  transpilePackages: ["@chronomint/ui", "@chronomint/contracts"],
  experimental: {
    optimizePackageImports: ["@chronomint/ui", "lucide-react"]
  }
};

export default withBundleAnalyzer(nextConfig);
