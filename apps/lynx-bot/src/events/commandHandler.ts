import {
  AutocompleteInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  Collection,
  EmbedBuilder,
  Events,
  MessageFlags,
  PermissionFlagsBits,
  PermissionsBitField,
} from "discord.js";
import { Event } from "../structures/Event";
import { LynxClient } from "../client/client";
import { Command } from "../structures/Command";

export default class CommandHandlerEvent extends Event {
  constructor(client: LynxClient) {
    super(client, {
      name: "CommandHandlerEvent",
      type: Events.InteractionCreate,
      once: false,
      enabled: true,
      description: "Command Handler Event",
      docs: `### Summary
Triggered by interaction creation.

### Flow
- Dispatches slash commands and subcommands.
- Handles permissions and cooldowns.
- Logs command usage.`,
    });
  }

  public async eventExecute(
    interaction: ChatInputCommandInteraction | AutocompleteInteraction,
  ) {
    if (interaction.isChatInputCommand()) {
      const command: Command | undefined = this.client.commands.get(
        interaction.commandName,
      );

      if (!command) {
        const embed = new EmbedBuilder()
          .setTitle("This command does not exist!")
          .setDescription("(ノω<。)ノ))☆.。")
          .setColor("Red");

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        this.client.commands.delete(interaction.commandName);
        return;
      }

      if (interaction.channel?.isDMBased() && !command.allowDm) {
        const embed = new EmbedBuilder()
          .setTitle("This command cannot be used in DMs.")
          .setDescription("Please use this command in a server.")
          .setColor("Red");

        interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Check if user has permissions
      const member = interaction.guild?.members.cache.get(interaction.user.id);

      if (member) {
        // it works idc
        const hasPerms = command.userPermissions.every((p) =>
          //@ts-ignore
          member.permissions.has(PermissionsBitField.Flags[p]),
        );
        const embed = new EmbedBuilder()
          .setTitle(`You do not have permission to use this command!`)
          .setDescription(
            `You need the following permissions to use this command: ${command.userPermissions.join(
              ", ",
            )}`,
          )
          .setColor("Red");

        if (!hasPerms) {
          interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      // check if Lynx has permissions
      const lynx = interaction.guild?.members.me;

      if (lynx) {
        const embed = new EmbedBuilder()
          .setTitle(`I dont have required permissions to use this command!`)
          .setDescription(
            `I need the following permissions to use this command: ${command.clientPermissions.join(
              ", ",
            )}`,
          )
          .setColor("Red");

        if (!lynx.permissions.has(command.clientPermissions)) {
          interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
      }

      // check if command is only for specific user/s

      if (
        command.userOnly.length > 0 &&
        !command.userOnly.includes(interaction.user.id)
      ) {
        const embed = new EmbedBuilder()
          .setTitle("This command is only for specified people.")
          .setColor("Red");

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      }

      const isNSFW =
        interaction.channel?.type === ChannelType.GuildText &&
        interaction.channel.nsfw;
      if (command.nsfw && !isNSFW) {
        const embed = new EmbedBuilder()
          .setTitle("This command can only be used in an NSFW channel.")
          .setColor("Red");

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      }

      // bypass cooldowns for owner and filtered users
      if (
        !(interaction.user.id == this.client.owner) ||
        !command.cooldownFilteredUsers.includes(interaction.user.id)
      ) {
        const { cooldowns } = this.client;

        if (!cooldowns.has(command.name)) {
          cooldowns.set(command.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.name)!;
        const cooldownAmount = command.cooldown * 1000;

        if (
          timestamps.has(interaction.user.id) &&
          now < (timestamps.get(interaction.user.id) || 0) + cooldownAmount
        ) {
          const embed = new EmbedBuilder()
            .setTitle("Cooldown")
            .setDescription(
              `You are on cooldown for ${(
                ((timestamps.get(interaction.user.id) || 0) +
                  cooldownAmount -
                  now) /
                1000
              ).toFixed(1)} seconds`,
            )
            .setColor("Red");

          interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(
          () => timestamps.delete(interaction.user.id),
          cooldownAmount,
        );
      }

      try {
        const subCommandGroup = interaction.options.getSubcommandGroup(false);
        const subCommand = `${interaction.commandName}${
          subCommandGroup ? `.${subCommandGroup}` : ""
        }.${interaction.options.getSubcommand(false) || ""}`;

        const subCommandExec = this.client.subCommands.get(subCommand);

        // Await subcommand if it exists
        if (subCommandExec) {
          subCommandExec.slashCommandExecute(interaction);
        }

        // Await main command execution
        return command?.slashCommandExecute(interaction);
        //return command?.slashCommandExecute(interaction) || this.client.subCommands?.get(subCommand)?.slashCommandExecute(interaction)
      } catch (e) {
        this.logger.error(
          `Error while executing slash command ${interaction.commandName}: ${e}`,
        );
      }
    }

    if (interaction.isAutocomplete()) {
      const command = this.client.commands.get(interaction.commandName);

      if (!command) {
        this.logger.error(
          `No command matching ${interaction.commandName} was found.`,
        );
        return;
      }

      try {
        await command.autoComplete(interaction);
      } catch (error) {
        this.logger.error(
          `Error while executing autocomplete command ${interaction.commandName}: ${error}`,
        );
      }
    }
  }
}
