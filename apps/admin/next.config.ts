import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@chronomint/ui", "@chronomint/contracts"]
};

export default nextConfig;
