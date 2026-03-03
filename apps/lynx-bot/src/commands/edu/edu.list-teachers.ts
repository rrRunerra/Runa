import { client } from "../../index";
import { SubCommand } from "../../structures/SubCommand";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { EdupageUtils } from "@runa/edupage";

export default class ListTeachersCommand extends SubCommand {
  constructor() {
    super(client, {
      name: "edu.list-teachers",
      enabled: true,
      docs: `### Summary
List all teachers registered on Edupage.

### Usage
\`/edu list-teachers\``,
    });
  }

  public async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    const utils = EdupageUtils.getInstance();
    await utils.login();

    const data = utils.getTeachers();
    const formattedData = data
      .map(
        (item: {
          firstName: string;
          lastName: string;
          shortName: string;
          id: string;
        }) =>
          `${item.firstName} ${item.lastName} (${item.shortName}) - ID: ${item.id}`,
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("Teachers")
      .setDescription(formattedData.substring(0, 4096))
      .setColor("Blurple");

    await interaction.editReply({ embeds: [embed] });
  }
}
