import type { NextConfig } from "next";

const API_URL = process.env.API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  images: {
    // Optimization is on: this app is served by `next start`, not exported
    // statically any more, so the optimizer is available. The catalog is
    // image-heavy (several source PNGs are >1MB), and this converts them to
    // AVIF/WebP at the size actually rendered.
    formats: ["image/avif", "image/webp"],
    // Admin-uploaded media is served from the Express API through the
    // /uploads rewrite below; it resolves same-origin, so no remotePatterns
    // entry is needed for it.
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
