import type { NextConfig } from "next";

const REQUIRED_ENVS = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

for (const env of REQUIRED_ENVS) {
  if (!process.env[env]) {
    throw new Error(`Missing required environment variable: ${env}`);
  }
}

const nextConfig: NextConfig = {
  reactCompiler: false,
  transpilePackages: [
    "@runa/auth",
    "@runa/database",
    "@runa/cache",
    "@runa/permissions"
  ],
  allowedDevOrigins: ["192.168.0.56", "192.168.0.44"],

  experimental: {
    useTypeScriptCli: true,
  },
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "192.168.0.44",
        port: "9000",
      }
    ],
  },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/polaris",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
