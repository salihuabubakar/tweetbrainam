import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@tweetbrainam/ui", "@tweetbrainam/contracts"],
};

export default nextConfig;
