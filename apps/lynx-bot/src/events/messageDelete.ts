import { Events, Message, PartialMessage } from "discord.js";
import { LynxClient } from "../client/client";
import { Event } from "../structures/Event";
import { rewindBuffer } from "../services/rewindBufferService";

export default class MessageDeleteEvent extends Event {
  constructor(client: LynxClient) {
    super(client, {
      name: "MessageDeleteEvent",
      type: Events.MessageDelete,
      once: false,
      enabled: true,
      description: "Triggered when a message is deleted.",
      docs: "Buffers deleted message count in rewindBuffer.",
    });
  }

  public async eventExecute(message: Message | PartialMessage) {
    if (message.author?.bot) return;
    if (!message.guildId || !message.author) return;

    rewindBuffer.recordMessageDeleted(message.guildId, message.author.id);
  }
}
