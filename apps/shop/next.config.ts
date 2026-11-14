import type { NextConfig } from "next";

const API_URL = (process.env.API_URL || "http://localhost:8090").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Pack photos are served by the API (GET /api/media/{id}, immutable). The shop exposes them
  // same-origin under /media/{id} so next/image optimises them like local files.
  async rewrites() {
    return [{ source: "/media/:id", destination: `${API_URL}/api/media/:id` }];
  },
  images: {
    localPatterns: [
      { pathname: "/media/**", search: "" },
      { pathname: "/logos/**", search: "" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [70, 75, 85],
    minimumCacheTTL: 31_536_000,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
