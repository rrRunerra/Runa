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

export default class BanCommand extends Command {
  constructor() {
    super({
      name: "ban",
      description: "Ban a user from the server",
      category: "Moderation",
      cooldown: 3,
      nsfw: false,
      clientPermissions: ["BanMembers"],
      userPermissions: ["BanMembers"],
      dev: client.mode,
      enabled: true,
      cooldownFilteredUsers: [],
      serverOnly: [],
      userOnly: [],
      options: [
        {
          name: "user",
          description: "The user to ban",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: "reason",
          description: "The reason for the ban",
          type: ApplicationCommandOptionType.String,
          required: false,
          maxLength: 4096,
        },
        {
          name: "duration",
          description: "The duration of the ban in hours.",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 1,
          maxValue: 604800,
        },
      ],
      allowDm: false,
      docs: `### Summary
Ban a member from the server.

### Usage
\`/ban <user> [reason] [deleteMessages]\`

### Details
- Requires 'Ban Members' permission.
- \`deleteMessages\` can be 'none', '1hour', '6hours', '12hours', '1day', '3days', or '7days'.`,
    });
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const user: User = interaction.options.getUser("user")!;
    const reason: string | null = interaction.options.getString("reason");
    const duration: number | null = interaction.options.getInteger("duration");

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
      errorEmbed.setDescription("You cannot ban yourself.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (user.id === client.user?.id) {
      errorEmbed.setDescription("I cannot ban myself.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (user.bot) {
      errorEmbed.setDescription("I cannot ban a bot.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!interaction.guild?.members.cache.get(user.id)?.kickable) {
      errorEmbed.setDescription("I cannot ban this user.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      Promise.allSettled([
        interaction.guild?.members.ban(user.id, {
          reason: reason ?? "No reason provided",
        }),
        this.client.prisma.lynxBanHistory.create({
          data: {
            userId: user.id,
            guildId: interaction.guild?.id!,
            moderator: interaction.user.id,
            reason: reason ?? "No reason provided",
            duration: duration ?? 0,
            until: duration
              ? new Date(Date.now() + duration * 60 * 60 * 1000)
              : null,
          },
        }),
      ]);
      successEmbed.setDescription(
        `Successfully banned ${user.tag} for ${reason ?? "No reason provided"}`,
      );

      interaction.reply({
        embeds: [successEmbed],
      });
    } catch (error) {
      errorEmbed.setDescription("An error occurred while banning the user.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
