import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../structures/Command";
import { client } from "../../index";

export default class RngCommand extends Command {
  constructor() {
    super({
      name: "rng",
      description: "Generate a random number",
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
      options: [
        {
          name: "from",
          description: "The lower bound of the range",
          type: ApplicationCommandOptionType.Number,
          required: true,
        },
        {
          name: "to",
          description: "The upper bound of the range",
          type: ApplicationCommandOptionType.Number,
          required: true,
        },
      ],
      allowDm: true,
      docs: "Generate a random number which may or may not be rigged.",
    });
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const from = interaction.options.getNumber("from");
    const to = interaction.options.getNumber("to");

    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder();

    if (!from || !to) {
      embed.setColor("Red");
      embed.setDescription("Please provide a valid range.");
      return interaction.editReply({
        embeds: [embed],
      });
    }
    const rig = await this.client.prisma.lynxRngRigConfig.findMany();

    const ignoredNumbers = (rig[0]?.ignoredNumbers as Array<number>) || [];

    // Calculate how many integers in the [from, to] range are actually ignored
    const uniqueIgnoredInRange = new Set(
      ignoredNumbers.filter((n) => n >= from && n <= to),
    );
    const rangeSize = Math.floor(to - from + 1);

    // If all numbers in the requested range are ignored, we disable the rig to avoid infinite loop
    const disableRig = uniqueIgnoredInRange.size >= rangeSize;

    let rng = Math.floor(Math.random() * (to - from + 1)) + from;

    if (!disableRig) {
      while (ignoredNumbers.includes(rng)) {
        rng = Math.floor(Math.random() * (to - from + 1)) + from;
      }
    }

    embed.setColor("Green");
    embed.setDescription(`The random number is ${rng}`);
    await interaction.editReply({
      embeds: [embed],
    });
  }
}
