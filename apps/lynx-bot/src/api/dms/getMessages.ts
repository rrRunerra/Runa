import { Request, Response } from "express";
import { LynxClient } from "../../client/client";
import { API } from "../../structures/Api";
import { DMChannel, TextChannel } from "discord.js";

export default class GetDmMessagesApi extends API {
  public client: LynxClient;

  constructor(client: LynxClient) {
    super({
      enabled: true,
      route: "/dms/getMessages",
      docs: `### Endpoint
\`GET /dms/getMessages?channelId=...\`

### Summary
Returns recent messages from a specific DM channel.`,
    });
    this.client = client;
  }

  public GET = async (req: Request, res: Response) => {
    const channelId = req.query.channelId as string;

    if (!channelId) {
      return res.status(400).json({ error: "channelId is required" });
    }

    try {
      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !(channel instanceof DMChannel)) {
        return res.status(404).json({ error: "DM Channel not found" });
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
      res.status(500).json({ error: "Failed to fetch DM messages" });
    }
  };
}
