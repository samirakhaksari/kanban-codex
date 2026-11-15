import type { NextConfig } from "next";

const apiOrigin = process.env.KANBAN_API_ORIGIN;

if (process.env.VERCEL === "1" && !apiOrigin) {
  throw new Error("Set KANBAN_API_ORIGIN to the deployed backend origin before deploying to Vercel.");
}

const nextConfig: NextConfig = apiOrigin ? {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${new URL(apiOrigin).origin}/api/:path*` }];
  },
} : {
  // The local Docker image serves this export from FastAPI.
  output: "export",
};

export default nextConfig;
