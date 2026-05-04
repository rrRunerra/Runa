import type { NextConfig } from "next";

const REQUIRED_ENVS = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

for (const env of REQUIRED_ENVS) {
  if (!process.env[env]) {
    throw new Error(`Missing required environment variable: ${env}`);
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@runa/auth"],
  allowedDevOrigins: ["192.168.0.56"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;
