import type { NextConfig } from "next";

const webOrigin = new URL(process.env.WEB_ORIGIN ?? "http://localhost:3010")
  .origin;
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        condition: { not: { path: "*.module.css" } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://127.0.0.1:8010"}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/python-worker.js",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src ${webOrigin}/python-runtime/; worker-src 'none'; object-src 'none'`,
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
