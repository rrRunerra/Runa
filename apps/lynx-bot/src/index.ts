import { LynxClient } from "./client/client";

export const client = new LynxClient();

await client.start();

const shutdown = async () => {
  try {
    const { rewindBuffer } = await import("./services/rewindBufferService");
    await rewindBuffer.flushToDatabase();
  } catch (err) {
    console.error("Failed to flush buffer on shutdown:", err);
  }
  await client.destroy();
  await client.prisma.$disconnect();
  process.exit(0);
};


process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
