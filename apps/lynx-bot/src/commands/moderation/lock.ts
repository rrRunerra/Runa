import {
  ApplicationCommandOptionType,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildChannel,
  TextChannel,
  PermissionFlagsBits,
  MessageFlags,
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

export default class LockCommand extends Command {
  constructor() {
    super({
      name: "lock",
      description: "Lock a channel (deny SEND_MESSAGES) for @everyone",
      category: "Moderation",
      cooldown: 3,
      nsfw: false,
      clientPermissions: ["ManageChannels"],
      userPermissions: ["ManageChannels"],
      dev: client.mode,
      enabled: true,
      cooldownFilteredUsers: [],
      serverOnly: [],
      userOnly: [],
      options: [
        {
          name: "channel",
          description: "The channel to lock (default: current channel)",
          type: ApplicationCommandOptionType.Channel,
          required: false,
          channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
        },
      ],
      allowDm: false,
      docs: `### Summary
Lock a channel by denying @everyone permission to send messages.

### Usage
\`/lock [channel]\`

### Details
- Permissions modified: \`SendMessages\`.`,
    });
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const channel = (interaction.options.getChannel("channel") ||
      interaction.channel) as TextChannel;

    errorEmbed.setFooter({
      text: client.user?.displayName ?? client.user?.username ?? "Lynx",
      iconURL: client.user?.displayAvatarURL(),
    });

    if (!channel) {
      errorEmbed.setDescription("Could not resolve the channel.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (
      channel.permissionOverwrites.cache
        .get(interaction.guild!.id)
        ?.deny.has(PermissionFlagsBits.SendMessages)
    ) {
      errorEmbed.setDescription("This channel is already locked.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await channel.permissionOverwrites.edit(interaction.guild!.id, {
        SendMessages: false,
      });

      successEmbed.setDescription(`Successfully locked ${channel}.`);
      return interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error(error);
      errorEmbed.setDescription("An error occurred while locking the channel.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
