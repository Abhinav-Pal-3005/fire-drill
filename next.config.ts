import type { NextConfig } from "next";

const allowedDevOrigins = [
  "**.run.app",
  "**.google.com",
  "**.googleusercontent.com",
  "127.0.0.1",
  "localhost",
];

if (process.env.APP_URL) {
  try {
    allowedDevOrigins.push(new URL(process.env.APP_URL).hostname);
  } catch {
    // Ignore invalid APP_URL
  }
}

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  ...(isStaticExport ? { images: { unoptimized: true } } : {}),
  allowedDevOrigins,
};

export default nextConfig;
