import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const backendUrl = process.env.INTERNAL_BACKEND_URL || "http://localhost:5000";
    const analyticsUrl = process.env.INTERNAL_ANALYTICS_URL || "http://localhost:8000";

    return [
      // 1. Short URL Redirection passthrough
      {
        source: "/s/:path*",
        destination: `${backendUrl}/s/:path*`,
      },
      // 2. Backend Core API passthrough
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      // 3. Analytics Service passthrough (Secured through Express Gateway)
      {
        source: "/api/analytics/:path*",
        destination: `${backendUrl}/api/v1/analytics/:path*`,
      },
    ];
  },
};

export default nextConfig;
