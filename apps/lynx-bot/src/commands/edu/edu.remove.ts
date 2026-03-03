import { client } from "../../index";
import { SubCommand } from "../../structures/SubCommand";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

export default class EduRemoveCommand extends SubCommand {
  constructor() {
    super(client, {
      name: "edu.remove",
      enabled: true,
      docs: `### Summary
Remove a specific homework entry by its SuperID.

### Usage
\`/edu remove <superid>\``,
    });
  }

  public async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    const superId = interaction.options.getString("superid", true);
    const embed = new EmbedBuilder();

    await client.prisma.lynxHomeworkExists
      .deleteMany({
        where: {
          superID: superId,
          guilID: interaction.guild?.id,
        },
      })
      .catch((e) => {
        console.error(
          `Error deleting homework ${superId} in guild ${interaction.guild?.name}: ${e}`,
        );
        embed.setTitle("Error deleting homework");
        embed.setColor("Red");
        return interaction.editReply({ embeds: [embed] });
      });

    embed.setTitle("Homework Removed");
    embed.setColor("Green");
    return await interaction.editReply({ embeds: [embed] });
  }
}
