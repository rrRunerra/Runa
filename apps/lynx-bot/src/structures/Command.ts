import { LynxClient } from "../client/client";
import { client } from "../index";
import * as Discord from "discord.js";
import { ConsoleLogger } from "@nestjs/common";
import { createLogger } from "../utils/logger";
import { ICommandOptions } from "@astral/types/lynx";

export class Command {
  public name: string;
  public description: string;
  public category: string;
  public options: Discord.ApplicationCommandOption[];
  public cooldown: number;
  public userPermissions: Discord.PermissionResolvable[];
  public clientPermissions: Discord.PermissionResolvable[];
  public dev: string;
  public serverOnly: string[];
  public userOnly: string[];
  public enabled: boolean;
  public nsfw: boolean;
  public cooldownFilteredUsers: string[];
  public allowDm: boolean;
  public client: LynxClient = client;
  public docs: string;
  public logger: ConsoleLogger;

  constructor(options: ICommandOptions) {
    this.name = options.name;
    this.description = options.description;
    this.category = options.category;
    this.options = options.options || []; // for slash commands
    this.cooldown = options.cooldown || 3;
    this.userPermissions = options.userPermissions || [];
    this.clientPermissions = options.clientPermissions || [];
    this.dev = options.dev;
    this.serverOnly = options.serverOnly || [];
    this.userOnly = options.userOnly || [];
    this.enabled = options.enabled;
    this.nsfw = options.nsfw;
    this.cooldownFilteredUsers = options.cooldownFilteredUsers || [];
    this.allowDm = options.allowDm || false;
    this.docs = options.docs;
    this.logger = createLogger(this.name);
  }

  public async autoComplete(
    interaction: Discord.AutocompleteInteraction,
  ): Promise<any> {}

  public async slashCommandExecute(
    interaction: Discord.ChatInputCommandInteraction,
  ): Promise<any> {}
}

export type { ICommandOptions } from "@astral/types/lynx";
