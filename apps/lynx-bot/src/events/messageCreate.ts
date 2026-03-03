import { Events, Message, TextChannel } from "discord.js";
import { LynxClient } from "../client/client";
import { Event } from "../structures/Event";

export default class MessageCreateEvent extends Event {
  constructor(client: LynxClient) {
    super(client, {
      name: "MessageCreateEvent",
      type: Events.MessageCreate,
      once: false,
      enabled: true,
      description: "Triggered when a message is created.",
      docs: `### Summary
Triggered when a message is created in a guild channel.`,
    });
  }

  public async eventExecute(message: Message) {
    if (!(message.channel instanceof TextChannel)) return;

    // Emit a custom event on the client that the SSE API can listen to
    this.client.emit("message_create_socket", {
      id: message.id,
      content: message.content,
      cleanContent: message.cleanContent,
      channelId: message.channelId,
      guildId: message.guildId,
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
      })),
      embeds: message.embeds.map((e) => ({
        title: e.title,
        description: e.description,
        url: e.url,
        color: e.color,
      })),
    });
  }
}
