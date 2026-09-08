import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

function remoteImagePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    {
      protocol: "https",
      hostname: "images.unsplash.com",
      pathname: "/**",
    },
    {
      protocol: "https",
      hostname: "media.valorant-api.com",
      pathname: "/**",
    },
  ];

  const s3PublicUrl = process.env.S3_PUBLIC_URL;
  if (s3PublicUrl) {
    try {
      const host = new URL(s3PublicUrl).hostname;
      patterns.push({
        protocol: "https",
        hostname: host,
        pathname: "/**",
      });
    } catch {
      // ignore invalid S3_PUBLIC_URL at build time
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Agent icons, map splashes and rank badges are effectively immutable, so
    // the 4h default just forces needless re-optimization of the same bytes.
    minimumCacheTTL: 2678400, // 31 days
    // 45 is for decorative artwork that sits behind dark overlays (match card
    // map splashes), where detail is never visible. 75 stays the default.
    qualities: [45, 75],
    remotePatterns: remoteImagePatterns(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/listings", destination: "/careers", permanent: true },
      { source: "/listings/:slug", destination: "/careers/:slug", permanent: true },
    ];
  },
};

export default nextConfig;

// Touch to restart dev server: 2

