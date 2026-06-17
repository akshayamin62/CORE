import type { NextConfig } from "next";
import path from "path";

const ngrokHost = process.env.NGROK_FRONTEND_HOST?.trim();

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Allow ngrok tunnel in dev (set NGROK_FRONTEND_HOST=xxxx.ngrok-free.app)
  ...(ngrokHost ? { allowedDevOrigins: [ngrokHost] } : {}),
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL || "http://localhost:5000";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
    ];
  },
};

export default nextConfig;

