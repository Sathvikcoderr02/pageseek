import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.toscrape.com",
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
