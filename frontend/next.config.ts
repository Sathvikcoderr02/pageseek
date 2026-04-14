import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.toscrape.com",
      },
    ],
    unoptimized: true, // allow any image URL during development
  },
};

export default nextConfig;
