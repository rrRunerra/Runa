import dotenv from "dotenv";
import type { NextConfig } from "next";

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
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
