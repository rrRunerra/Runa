import type { NextConfig } from "next";
import dotenv from "dotenv";

try {
  dotenv.config({ path: "../../.env" });
} catch (error) {
  console.error("Error loading .env file:", error);
} finally {
  console.log("Loaded .env file");
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@runa/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/avatars/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/icons/**",
      },
    ],
  },
};

export default nextConfig;
