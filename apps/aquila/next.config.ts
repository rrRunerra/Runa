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
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["@runa/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
