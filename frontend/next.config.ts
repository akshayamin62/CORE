import type { NextConfig } from "next";
import path from "path";
import { existsSync, readFileSync } from "fs";

function collectAllowedDevOrigins(): string[] {
  const origins = new Set<string>();

  const ngrokHost = process.env.NGROK_FRONTEND_HOST?.trim();
  if (ngrokHost) origins.add(ngrokHost);

  const addUrlHost = (raw?: string) => {
    if (!raw) return;
    try {
      origins.add(new URL(raw.trim()).hostname);
    } catch {
      /* ignore invalid URL */
    }
  };

  addUrlHost(process.env.CAPACITOR_SERVER_URL);

  const capEnvPath = path.join(__dirname, ".env.capacitor.local");
  if (existsSync(capEnvPath)) {
    for (const line of readFileSync(capEnvPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key === "CAPACITOR_SERVER_URL") {
        addUrlHost(rest.join("=").trim().replace(/^["']|["']$/g, ""));
      }
    }
  }

  // Capacitor on phone loads dev server by LAN IP — allow private subnets in dev.
  origins.add("192.168.*");
  origins.add("10.*");

  return [...origins];
}

const allowedDevOrigins = collectAllowedDevOrigins();

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL || "http://localhost:5000";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
    ];
  },
};

export default nextConfig;

