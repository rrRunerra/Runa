import { ChatInputCommandInteraction } from "discord.js";
import { LynxClient } from "../client/client";
import { ConsoleLogger } from "@nestjs/common";
import { createLogger } from "../utils/logger";
import { ISubCommandOptions } from "@astral/types/lynx";

export class SubCommand {
  public name: string;
  public enabled: boolean;
  public client: LynxClient;
  public docs: string;
  public logger: ConsoleLogger;

  constructor(client: LynxClient, options: ISubCommandOptions) {
    this.name = options.name;
    this.enabled = options.enabled;
    this.client = client;
    this.docs = options.docs;
    this.logger = createLogger(this.name);
  }

  public async slashCommandExecute(
    interaction: ChatInputCommandInteraction,
  ): Promise<any> {}
}

export type { ISubCommandOptions } from "@astral/types/lynx";
