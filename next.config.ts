import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // Hide the Next.js "N" / DevTools bubble in the corner
  devIndicators: false,
};

export default nextConfig;
