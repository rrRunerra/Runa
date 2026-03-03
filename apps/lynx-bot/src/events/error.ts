import { Events } from "discord.js";
import { LynxClient } from "../client/client";
import { Event } from "../structures/Event";

export default class ErrorEvent extends Event {
  constructor(client: LynxClient) {
    super(client, {
      name: "ErrorEvent",
      type: Events.Error,
      once: false,
      enabled: true,
      description: "Error event",
      docs: `### Summary
Triggered when the client encounters an error.

### Flow
- Logs the error.`,
    });
  }

  public async eventExecute(error: Error) {
    this.logger.error(error);
  }
}
