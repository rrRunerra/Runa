import { Events, Message, PartialMessage } from "discord.js";
import { LynxClient } from "../client/client";
import { Event } from "../structures/Event";
import { rewindBuffer } from "../services/rewindBufferService";

export default class MessageUpdateEvent extends Event {
  constructor(client: LynxClient) {
    super(client, {
      name: "MessageUpdateEvent",
      type: Events.MessageUpdate,
      once: false,
      enabled: true,
      description: "Triggered when a message is edited.",
      docs: "Buffers edited message count in rewindBuffer.",
    });
  }

  public async eventExecute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    if (newMessage.author?.bot) return;
    if (!newMessage.guildId || !newMessage.author) return;

    rewindBuffer.recordMessageEdited(newMessage.guildId, newMessage.author.id);
  }
}
