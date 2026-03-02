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
};

export default nextConfig;
