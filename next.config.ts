import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: process.env.INTERNAL_BACKEND_URL 
          ? `${process.env.INTERNAL_BACKEND_URL}/api/v1/:path*`
          : "http://localhost:5000/api/v1/:path*",
      },
      {
        source: "/api/analytics/:path*",
        destination: process.env.INTERNAL_ANALYTICS_URL
          ? `${process.env.INTERNAL_ANALYTICS_URL}/api/v1/:path*`
          : "http://localhost:8000/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
