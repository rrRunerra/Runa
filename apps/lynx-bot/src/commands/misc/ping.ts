import {
  ApplicationCommandOptionChannelTypesMixin,
  ApplicationCommandOptionType,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "../../structures/Command";
import { client } from "../../index";

export default class PingCommand extends Command {
  constructor() {
    super({
      name: "ping",
      description: "Ping the bot",
      category: "Misc",
      cooldown: 5,
      nsfw: false,
      clientPermissions: ["SendMessages", "EmbedLinks"],
      userPermissions: ["SendMessages", "UseApplicationCommands"],
      dev: client.mode,
      enabled: true,
      cooldownFilteredUsers: [],
      serverOnly: [],
      userOnly: [],
      options: [],
      allowDm: true,
      docs: "Ping the bot",
    });
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor("Blurple")
      .setDescription(`Pong! Latency: ${interaction.client.ws.ping}ms`);
    await interaction.reply({
      content: `Ping?`,
      flags: MessageFlags.Ephemeral,
    });
    interaction.editReply({ embeds: [embed] });
  }
}
