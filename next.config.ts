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

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins,
};

export default nextConfig;
