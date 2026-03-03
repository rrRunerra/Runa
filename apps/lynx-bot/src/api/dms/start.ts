import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";
import { ChannelType } from "discord.js";

export default class StartDmApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/dms/start",
      docs: `### Endpoint
\`GET /dms/start?userId=...\`

### Summary
Finds or creates a DM channel with a user and returns the channel ID.`,
    });
    this.client = client;
  }

  public GET = async (req: Request, res: Response) => {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    try {
      const user = await this.client.users.fetch(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const dmChannel = await user.createDM();

      res.json({
        id: dmChannel.id,
        recipient: {
          id: user.id,
          username: user.username,
          globalName: user.globalName,
          avatarURL: user.displayAvatarURL(),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to start DM" });
    }
  };
}
