import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";
import { DMChannel, User } from "discord.js";

export default class SendDmMessageApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/dms/sendMessage",
      docs: `### Endpoint
\`POST /dms/sendMessage\`

### Body
- \`userId\`: The ID of the recipient.
- \`content\`: The message content.

### Summary
Sends a DM to a user.`,
    });
    this.client = client;
  }

  public POST = async (req: Request, res: Response) => {
    const { userId, channelId, content } = req.body;

    if (!content || (!userId && !channelId)) {
      return res
        .status(400)
        .json({ error: "content and either userId or channelId are required" });
    }

    try {
      let target: User | DMChannel;

      if (channelId) {
        const channel = await this.client.channels.fetch(channelId);
        if (!channel || !(channel instanceof DMChannel)) {
          return res.status(404).json({ error: "DM Channel not found" });
        }
        target = channel;
      } else {
        const user = await this.client.users.fetch(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        target = user;
      }

      const message = await target.send({ content });

      res.json({
        id: message.id,
        content: message.content,
        cleanContent: message.cleanContent,
        channelId: message.channelId,
        createdTimestamp: message.createdTimestamp,
        author: {
          username: message.author.username,
          globalName: message.author.globalName,
          id: message.author.id,
          avatarURL: message.author.displayAvatarURL(),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to send DM" });
    }
  };
}
