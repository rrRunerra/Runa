import "dotenv/config";
import { LynxClient } from "./client/client";
import { config } from "dotenv";

config({
  path: "../../.env",
});

export const client = new LynxClient();

await client.start();

const shutdown = async () => {
  await client.destroy();
  await client.prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
