import { Events } from "discord.js";
import { LynxClient } from "../client/client";
import { ConsoleLogger } from "@nestjs/common";
import { createLogger } from "../utils/logger";
import { IEventOptions } from "@astral/types/lynx";

export class Event {
  public name: string;
  public type: Events;
  public once: boolean;
  public enabled: boolean;
  public description: string;
  public client: LynxClient;
  public docs: string;
  public logger: ConsoleLogger;

  constructor(client: LynxClient, options: IEventOptions) {
    this.name = options.name;
    this.type = options.type;
    this.description = options.description;
    this.once = options.once;
    this.enabled = options.enabled;
    this.client = client;
    this.docs = options.docs;
    this.logger = createLogger(this.name);
  }

  public async eventExecute(...args: any): Promise<any> {}
}

export type { IEventOptions } from "@astral/types/lynx";
