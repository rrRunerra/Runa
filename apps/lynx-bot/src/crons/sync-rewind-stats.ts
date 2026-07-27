import { Cron } from "../structures/Cron";
import { LynxClient } from "../client/client";
import { rewindBuffer } from "../services/rewindBufferService";

export default class SyncRewindStatsCron extends Cron {
  constructor(client: LynxClient) {
    super({
      name: "sync-rewind-stats",
      description: "Flushes activity tracking buffer to Postgres database every 60 seconds.",
      enabled: true,
      repeatTime: 60000, // 60 seconds
      excludeRunOnStart: true,
      docs: "Flushes accumulated in-memory deltas for message/VC/command activity into LynxUserYearlyStats table.",
    });
  }

  public async cronExecute(): Promise<void> {
    try {
      await rewindBuffer.flushToDatabase();
    } catch (error) {
      this.logger.error(`Failed to flush rewind stats buffer: ${error}`);
    }
  }
}
