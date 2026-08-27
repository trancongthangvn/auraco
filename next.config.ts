import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "auracojewelry.com",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
