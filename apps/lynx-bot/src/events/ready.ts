import { Events } from "discord.js";
import { LynxClient } from "../client/client";
import { Event } from "../structures/Event";

export default class ReadyEvent extends Event {
  constructor(client: LynxClient) {
    super(client, {
      name: "ReadyEvent",
      type: Events.ClientReady,
      once: true,
      enabled: true,
      description: "Ready event",
      docs: `### Summary
Triggered when the client becomes ready.

### Flow
- Initializes bot status.
- Caches guild and user information.
- Registers slash commands.`,
    });
  }

  public async eventExecute() {
    this.logger.log(`${this.client.user?.username} is online`);
  }
}
