import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// Next only reads .env files inside the app directory, but this monorepo keeps a
// single .env at the root that api and jobs also read. Loading it here runs before
// Next inlines NEXT_PUBLIC_* into the client bundle.
loadEnv({ path: resolve(process.cwd(), "../../.env") });

const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@tweetbrainam/ui", "@tweetbrainam/contracts"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
