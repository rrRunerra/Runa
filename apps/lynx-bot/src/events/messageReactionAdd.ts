import { Events, MessageReaction, PartialMessageReaction, User, PartialUser } from "discord.js";
import { LynxClient } from "../client/client";
import { Event } from "../structures/Event";
import { rewindBuffer } from "../services/rewindBufferService";

export default class MessageReactionAddEvent extends Event {
  constructor(client: LynxClient) {
    super(client, {
      name: "MessageReactionAddEvent",
      type: Events.MessageReactionAdd,
      once: false,
      enabled: true,
      description: "Triggered when a reaction is added to a message.",
      docs: "Buffers reactions added and reactions received in rewindBuffer.",
    });
  }

  public async eventExecute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }

    const guildId = reaction.message.guildId;
    if (!guildId) return;

    const authorUserId = reaction.message.author?.id;
    rewindBuffer.recordReaction(guildId, user.id, authorUserId);
  }
}
