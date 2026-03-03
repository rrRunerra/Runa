import { client } from "../../index";
import { SubCommand } from "../../structures/SubCommand";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ForumChannel,
  MessageFlags,
} from "discord.js";
import { EdupageUtils } from "@runa/edupage";

export default class EduFillDbCommand extends SubCommand {
  constructor() {
    super(client, {
      name: "edu.fill-db",
      enabled: true,
      docs: `### Summary
Populate the database with existing Edupage assignments without posting.

### Usage
\`/edu fill-db\``,
    });
  }

  public async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    const utils = EdupageUtils.getInstance();
    await utils.login();

    const guildId = interaction.guild?.id;

    // Check config existing
    const hwChannels = await client.prisma.lynxHomeWorkChannels.findUnique({
      where: { guildId },
    });

    if (!hwChannels) {
      const embed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription("No homework channels configured for this server.")
        .setColor("Red");
      return interaction.editReply({ embeds: [embed] });
    }

    const channels: Record<string, string> = hwChannels.channels as Record<
      string,
      string
    >;

    const assignments = utils.edupage.assignments;

    const homework = (
      await Promise.all(
        assignments.map(async (work: any) => {
          if (
            await client.prisma.lynxHomeworkExists.findFirst({
              where: {
                superID: work.superId,
                guilID: guildId,
              },
            })
          ) {
            return null;
          }

          return {
            id: work.id,
            superId: work.superId,
            owner: {
              id: work.owner.id,
              name: `${work.owner.firstname} ${work.owner.lastname}`,
              userString: work.owner.userString,
            },
            subject: {
              id: work.subject.id,
              name: work.subject.name,
              shortName: work.subject.short,
            },
            title: work.title,
            testId: work.testId,
            type: work.type,
          };
        }),
      )
    ).filter((hw: any) => hw != null);

    if (homework.length == 0) {
      const embed = new EmbedBuilder()
        .setTitle("Info")
        .setDescription("Database is up to date.")
        .setColor("Green");
      return interaction.editReply({ embeds: [embed] });
    }

    console.info(`Filling DB for ${interaction.guild?.id}`);

    let noId: number = 0;

    for (const work of homework) {
      const forumId = channels[work.subject.shortName.toLowerCase()];
      if (!forumId) {
        noId++;
        continue;
      }

      // We need forum ID but we don't create threads
      await client.prisma.lynxHomeworkExists.create({
        data: {
          superID: work.superId,
          title: work.title,
          forumChannelID: "fill",
          forumID: forumId,
          guilID: guildId!,
        },
      });
    }

    console.info(`Filled DB for ${interaction.guild?.id}`);
    console.info(`No ID: ${noId}`);

    if (noId > 0) {
      const embed = new EmbedBuilder()
        .setTitle("Info")
        .setDescription(
          `No channel id found for subjects for ${noId} homeworks.`,
        )
        .setColor("Red");
      utils.edupage.exit();
      return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setTitle("Info")
      .setDescription(`Database filled with ${homework.length} items.`)
      .setColor("Green");
    interaction.editReply({ embeds: [embed] });
    utils.edupage.exit();
  }
}
