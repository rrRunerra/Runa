import { Collection, Events, REST, Routes } from "discord.js";
import { LynxClient } from "../client/client";
import { Event } from "../structures/Event";
import { Command } from "../structures/Command";
import type { ICommandOptions } from "../structures/Command.ts";
import "dotenv/config";

export default class RegisterCommandsEvent extends Event {
  constructor(client: LynxClient) {
    super(client, {
      name: "RegisterCommandsEvent",
      type: Events.ClientReady,
      once: true,
      enabled: true,
      description: "Register Slash Commands",
      docs: `### Summary
Synchronizes local command definitions with Discord.

### Flow
- Fetches existing application commands.
- Compares and updates Global, Guild, and Dev commands.
- Removes outdated command definitions.`,
    });
  }

  public async eventExecute() {
    const clientId = this.client.user?.id ?? "";
    const rest = new REST().setToken(this.client.token!);

    while (!this.client.areCommandsLoaded) {
      this.logger.warn("Waiting for commands to load");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (this.client.commands.size == 0) {
      this.logger.log("No commands to register returing...");
      return;
    }

    const globalCommandList = this.client.commands.filter(
      (command) =>
        command.dev != "development" &&
        command.serverOnly.length == 0 &&
        command.enabled,
    );

    const devCommandList = this.client.commands.filter(
      (command) => command.dev == "development" && command.enabled,
    );

    const serverCommandList = this.client.commands.filter(
      (command) =>
        command.enabled &&
        command.dev != "development" &&
        command.serverOnly.length > 0,
    );

    if (globalCommandList.size > 0) {
      const globalCommands: any = await rest
        .put(Routes.applicationCommands(clientId), {
          body: this.GetJson(globalCommandList),
        })
        .then((c: any) => {
          this.logger.log(`Succesfully loaded ${c.length} global (/) commands`);
        });
    }

    if (serverCommandList.size > 0) {
      for (const command of serverCommandList.values()) {
        for (const serverId of command.serverOnly) {
          const cmd: any = await rest.put(
            Routes.applicationGuildCommands(clientId, serverId),
            {
              body: this.GetJson(new Collection([[command.name, command]])),
            },
          );
          this.logger.log(
            `Loaded command: ${command.name} in server: ${serverId}`,
          );
        }
      }
      this.logger.log(
        `Succesfully loaded ${serverCommandList.size} server (/) commands`,
      );
    }

    if (devCommandList.size > 0) {
      const devCommands: any = await rest
        .put(
          Routes.applicationGuildCommands(clientId, process.env.DEV_SERVER!),
          {
            body: this.GetJson(devCommandList),
          },
        )
        .then((c: any) => {
          this.logger.log(`Succesfully loaded ${c.length} dev (/) commands`);
        });
    }
  }

  private GetJson(commands: Collection<string, Command>): object[] {
    const data: object[] = [];

    commands.forEach((command: ICommandOptions) => {
      data.push({
        name: command.name,
        description: command.description,
        category: command.category,
        options: command.options,
        cooldown: command.cooldown,
        userPermissions: command.userPermissions,
        clientPermissions: command.clientPermissions,
        dev: command.dev,
        serverOnly: command.serverOnly,
        userOnly: command.userOnly,
        enabled: command.enabled,
        nsfw: command.nsfw,
        cooldownFilteredUsers: command.cooldownFilteredUsers,
        allowDm: command.allowDm,
      });
    });

    return data;
  }
}
