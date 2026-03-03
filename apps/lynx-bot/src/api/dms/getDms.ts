import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";
import { ChannelType } from "discord.js";

export default class GetDmsApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/dms/getDms",
      docs: `### Endpoint
\`GET /dms/getDms\`

### Summary
Gets all active DM channels in the bot's cache.`,
    });
    this.client = client;
  }

  public GET = async (req: Request, res: Response) => {
    try {
      const dmChannels = this.client.channels.cache
        .filter((c) => c.type === ChannelType.DM)
        .map((c: any) => {
          const recipient = c.recipient;
          return {
            id: c.id,
            recipient: {
              id: recipient?.id,
              username: recipient?.username,
              globalName: recipient?.globalName,
              avatarURL: recipient?.displayAvatarURL(),
            },
            lastMessageId: c.lastMessageId,
          };
        });

      res.json(dmChannels);
    } catch (error) {
      this.logger.error(error);
      res.status(500).json({ error: "Failed to fetch DM channels" });
    }
  };
}
