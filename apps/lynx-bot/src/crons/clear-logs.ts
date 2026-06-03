import { Cron } from "../structures/Cron";
import { LynxClient } from "../client/client";

export default class ClearLogsCron extends Cron {
  constructor(client: LynxClient) {
    super({
      name: "clear-logs",
      description: "Clears database logs older than 2 days.",
      enabled: true,
      repeatTime: 172800000, // 2 days in milliseconds
      excludeRunOnStart: false,
      docs: "Deletes all logs from LynxLogs table where createdAt is older than 2 days.",
    });
  }

  public async cronExecute(): Promise<void> {
    const twoDaysAgo = new Date(Date.now() - 172800000);
    this.logger.log(`Deleting logs created before ${twoDaysAgo.toISOString()}...`);

    try {
      const deleteResult = await this.client.prisma.lynxLogs.deleteMany({
        where: {
          createdAt: {
            lt: twoDaysAgo,
          },
        },
      });
      this.logger.log(`Successfully cleared ${deleteResult.count} logs.`);
    } catch (error) {
      this.logger.error(`Failed to clear logs: ${error}`);
    }
  }
}