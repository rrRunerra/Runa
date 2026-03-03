import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";

export default class StatsApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      docs: `### Endpoint\n\`GET /stats\`\n\n### Summary\nReturns the bot's status, profile, and statistics.`,
    });
    this.client = client;
  }

  public GET = (req: Request, res: Response) => {
    try {
      if (!this.client.isReady()) {
        return res.status(503).json({ error: "Bot is starting or offline" });
      }

      const status = this.client.user?.presence.status || "offline";
      const profile = {
        name: this.client.user?.username,
        avatar: this.client.user?.displayAvatarURL({
          size: 512,
          extension: "png",
        }),
        description:
          this.client.application?.description || "A powerful Discord bot.",
        discriminator: this.client.user?.discriminator,
      };

      const stats = {
        servers: this.client.guilds.cache.size,
        commands: this.client.commands.size,
        events: this.client.events.size,
        ping: this.client.ws.ping,
      };

      return res.json({ status, profile, stats });
    } catch (e) {
      this.logger.error("Failed to fetch stats: ", e);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
