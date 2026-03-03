import {
  ApplicationCommandOptionChannelTypesMixin,
  ApplicationCommandOptionType,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  User,
} from "discord.js";
import { Command } from "../../structures/Command";
import { client } from "../../index";

const errorEmbed = new EmbedBuilder()
  .setColor("Red")
  .setTimestamp()
  .setTitle("Error");

const successEmbed = new EmbedBuilder()
  .setColor("Green")
  .setTimestamp()
  .setTitle("Success");

export default class KickCommand extends Command {
  constructor() {
    super({
      name: "kick",
      description: "Kick a user from the server",
      category: "Moderation",
      cooldown: 3,
      nsfw: false,
      clientPermissions: ["KickMembers"],
      userPermissions: ["KickMembers"],
      dev: client.mode,
      enabled: true,
      cooldownFilteredUsers: [],
      serverOnly: [],
      userOnly: [],
      options: [
        {
          name: "user",
          description: "The user to kick",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: "reason",
          description: "The reason for the kick",
          type: ApplicationCommandOptionType.String,
          required: false,
          maxLength: 4096,
        },
      ],
      allowDm: false,
      docs: `### Summary
Kick a member from the server.

### Usage
\`/kick <user> [reason]\`

### Details
- Requires 'Kick Members' permission.`,
    });
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const user: User = interaction.options.getUser("user")!;
    const reason: string | null = interaction.options.getString("reason");

    errorEmbed.setFooter({
      text: client.user?.displayName ?? client.user?.username ?? "Lynx",
      iconURL: client.user?.displayAvatarURL(),
    });

    if (!user) {
      errorEmbed.setDescription("Please provide a valid user.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (user.id === interaction.user.id) {
      errorEmbed.setDescription("You cannot kick yourself.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (user.id === client.user?.id) {
      errorEmbed.setDescription("I cannot kick myself.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (user.bot) {
      errorEmbed.setDescription("I cannot kick a bot.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!interaction.guild?.members.cache.get(user.id)?.kickable) {
      errorEmbed.setDescription("I cannot kick this user.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      Promise.allSettled([
        interaction.guild?.members.kick(
          user.id,
          reason ?? "No reason provided",
        ),
        this.client.prisma.lynxKickHistory.create({
          data: {
            userId: user.id,
            guildId: interaction.guild?.id!,
            moderator: interaction.user.id,
            reason: reason ?? "No reason provided",
          },
        }),
      ]);
      successEmbed.setDescription(
        `Successfully kicked ${user.tag} for ${reason ?? "No reason provided"}`,
      );

      interaction.reply({
        embeds: [successEmbed],
      });
    } catch (error) {
      errorEmbed.setDescription("An error occurred while kicking the user.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
