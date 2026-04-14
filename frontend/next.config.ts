import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Only proxy to the Python backend when BACKEND_URL is explicitly set.
    // In dev without it, the mock API routes at src/app/api/backend/* are used instead.
    if (!process.env.BACKEND_URL) return [];
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
