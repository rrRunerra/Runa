import { Events, Presence } from "discord.js";
import { LynxClient } from "../client/client";
import { Event } from "../structures/Event";
import { rewindBuffer } from "../services/rewindBufferService";

export default class PresenceUpdateEvent extends Event {
  constructor(client: LynxClient) {
    super(client, {
      name: "PresenceUpdateEvent",
      type: Events.PresenceUpdate,
      once: false,
      enabled: true,
      description: "Triggered when a member's presence/status updates.",
      docs: "Tracks online, idle, and DND status duration.",
    });
  }

  public async eventExecute(oldPresence: Presence | null, newPresence: Presence) {
    if (newPresence.user?.bot || !newPresence.guild?.id || !newPresence.userId) return;

    rewindBuffer.handlePresenceChange(newPresence.guild.id, newPresence.userId, newPresence.status);

    for (const act of newPresence.activities) {
      if (act.type === 4 && act.state) { // Custom Status
        rewindBuffer.recordCustomStatus(newPresence.guild.id, newPresence.userId, act.state);
      } else if (act.name === "Spotify" && act.details && act.state) { // Spotify
        // act.details is Track Name, act.state is Artist
        rewindBuffer.recordSpotifyActivity(newPresence.guild.id, newPresence.userId, act.details, act.state, 30);
      } else if (act.type === 0 && act.name) { // Playing Game
        rewindBuffer.recordGameActivity(newPresence.guild.id, newPresence.userId, act.name, 30);
      }
    }
  }
}

