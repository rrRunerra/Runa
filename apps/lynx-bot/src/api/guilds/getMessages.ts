import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";
import { TextChannel } from "discord.js";

export default class GetMessagesApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/guilds/:guildId/channels/:channelId/getMessages",
      docs: `### Endpoint
\`GET /guilds/:guildId/channels/:channelId/getMessages\`

### Summary
Gets messages from a specific channel in a guild.

### Parameters
- \`guildId\`: The ID of the guild.
- \`channelId\`: The ID of the channel.
`,
    });
    this.client = client;
  }

  public GET = async (req: Request, res: Response) => {
    const guildId = req.params.guildId as string;
    const channelId = req.params.channelId as string;

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

      const messages = (await channel.messages.fetch({ limit: 50 })).map(
        (message) => {
          return {
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
            attachments: message.attachments.map((a) => ({
              url: a.url,
              contentType: a.contentType,
              name: a.name,
              width: a.width,
              height: a.height,
            })),
            embeds: message.embeds.map((e) => ({
              title: e.title,
              description: e.description,
              url: e.url,
              color: e.color,
              image: e.image,
              video: e.video,
              thumbnail: e.thumbnail,
              footer: e.footer,
              fields: e.fields.map((f) => ({
                name: f.name,
                value: f.value,
                inline: f.inline,
              })),
            })),
          };
        },
      );

      res.json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  };
}
