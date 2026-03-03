import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";
import { TextChannel } from "discord.js";

export default class SendMessageApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/guilds/:guildId/channels/:channelId/send",
      docs: `### Endpoint
\`POST /guilds/:guildId/channels/:channelId/send\`

### Summary
Sends a message to a specific channel in a guild.

### Parameters
- \`guildId\`: The ID of the guild.
- \`channelId\`: The ID of the channel.
- \`content\`: The content of the message.`,
    });
    this.client = client;
  }

  public POST = async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const channelId = req.params.channelId as string;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    try {
      const guild =
        this.client.guilds.cache.get(guildId) ||
        (await this.client.guilds.fetch(guildId));
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      const channel =
        guild.channels.cache.get(channelId) ||
        (await guild.channels.fetch(channelId));

      if (!channel || !(channel instanceof TextChannel)) {
        return res
          .status(404)
          .json({ error: "Channel not found or not a text channel" });
      }

      const message = await channel.send({ content });

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
      res.status(500).json({ error: "Failed to send message" });
    }
  };
}
