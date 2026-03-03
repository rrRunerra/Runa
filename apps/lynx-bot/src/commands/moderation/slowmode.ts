import {
  ApplicationCommandOptionType,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  TextChannel,
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

export default class SlowmodeCommand extends Command {
  constructor() {
    super({
      name: "slowmode",
      description: "Set the slowmode for a channel.",
      category: "Moderation",
      cooldown: 5,
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
          name: "duration",
          description: "Duration in seconds (0 to disable)",
          type: ApplicationCommandOptionType.Integer,
          required: true,
          minValue: 0,
          maxValue: 21600, // Discord limit is 6 hours
        },
        {
          name: "channel",
          description: "Channel to set slowmode for (default: current)",
          type: ApplicationCommandOptionType.Channel,
          required: false,
          channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
        },
      ],
      allowDm: false,
      docs: `### Summary
Set the slowmode (rate limit) for a channel.

### Usage
\`/slowmode <duration> [channel]\`

### Details
- Duration format: \`5s\`, \`1m\`, \`2h\`, etc.`,
    });
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const duration = interaction.options.getInteger("duration", true);
    const channel = (interaction.options.getChannel("channel") ||
      interaction.channel) as TextChannel;

    if (!channel) {
      errorEmbed.setDescription("Could not resolve channel.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await channel.setRateLimitPerUser(duration);

      successEmbed.setDescription(
        `Successfully set slowmode for ${channel} to ${duration} seconds.`,
      );
      return interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error(error);
      errorEmbed.setDescription("An error occurred while setting slowmode.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
