import { LynxClient } from "./client/client";

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
