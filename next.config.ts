import type { NextConfig } from "next";

const API_URL = process.env.API_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  images: {
    // Optimization is on: this app is served by `next start`, not exported
    // statically any more, so the optimizer is available. The catalog is
    // image-heavy (several source PNGs are >1MB), and this converts them to
    // AVIF/WebP at the size actually rendered.
    formats: ["image/avif", "image/webp"],
    // Next.js 16 restricts `quality` to this allowlist (default: [75] only)
    // — a `quality={90}` on an <Image> is silently coerced back down to 75
    // unless its value is listed here. 90 added for the category rail tiles
    // (explicit request: sharper, since 75 read visibly soft there).
    qualities: [75, 90],
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
