import { Events, VoiceState } from "discord.js";
import { LynxClient } from "../client/client";
import { Event } from "../structures/Event";
import { rewindBuffer } from "../services/rewindBufferService";

export default class VoiceStateUpdateEvent extends Event {
  constructor(client: LynxClient) {
    super(client, {
      name: "VoiceStateUpdateEvent",
      type: Events.VoiceStateUpdate,
      once: false,
      enabled: true,
      description: "Triggered when a member joins, leaves, or switches a voice channel.",
      docs: "Tracks voice session duration and voice companions.",
    });
  }

  public async eventExecute(oldState: VoiceState, newState: VoiceState) {
    if (newState.member?.user.bot || oldState.member?.user.bot) return;

    const guildId = newState.guild.id || oldState.guild.id;
    const userId = newState.id;

    const voiceDetails = {
      isStreaming: newState.streaming || false,
      isCamera: newState.selfVideo || false,
      isMuted: newState.selfMute || false,
      isDeafened: newState.selfDeaf || false,
    };

    // Member joined a VC
    if (!oldState.channelId && newState.channelId) {
      rewindBuffer.handleVoiceJoin(guildId, userId, newState.channelId, voiceDetails);
      return;
    }

    // Member left a VC
    if (oldState.channelId && !newState.channelId) {
      const companions = oldState.channel?.members.map((m) => m.id) || [];
      rewindBuffer.handleVoiceLeave(guildId, userId, companions);
      return;
    }

    // Member moved between VCs
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const companions = oldState.channel?.members.map((m) => m.id) || [];
      rewindBuffer.handleVoiceLeave(guildId, userId, companions);
      rewindBuffer.handleVoiceJoin(guildId, userId, newState.channelId, voiceDetails);
      return;
    }
  }
}

