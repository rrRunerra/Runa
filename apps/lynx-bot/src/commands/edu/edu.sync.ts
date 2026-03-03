import { client } from "../../index";
import { SubCommand } from "../../structures/SubCommand";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ForumChannel,
  MessageFlags,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { EdupageUtils } from "@runa/edupage";
import download from "download";
import { htmlToText } from "html-to-text";
import fs from "fs";

export default class EduSyncCommand extends SubCommand {
  constructor() {
    super(client, {
      name: "edu.sync",
      enabled: true,
      docs: `Sync homework from Edupage to Discord. Posts new assignments to configured forums.`,
    });
  }

  public async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    const utils = EdupageUtils.getInstance();
    await utils.login();

    const startTime = Date.now();
    const guildId = interaction.guild?.id;

    const hwChannels = await client.prisma.lynxHomeWorkChannels.findUnique({
      where: { guildId },
    });

    if (!hwChannels) {
      const embed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription("No homework channels configured for this server.")
        .setColor("Red");
      console.error(`No channels config found for guild ${guildId}`);
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
          console.info(`Starting processing: ${work.title} (${work.id})`);
          if (
            await client.prisma.lynxHomeworkExists.findFirst({
              where: {
                superID: work.superId,
                guilID: guildId,
              },
            })
          ) {
            console.info(`Already exists skipping: ${work.title} (${work.id})`);
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
        .setDescription("No new homework found")
        .setColor("Green");
      return interaction.editReply({ embeds: [embed] });
    }

    for (const work of homework) {
      const forumId = channels[work.subject.shortName.toLowerCase()];
      if (!forumId) {
        console.error(`No forum found for subject: ${work.subject.shortName}`);
        continue;
      }

      const guild = interaction.guild;
      if (!guild) {
        console.error(`No guild found`);
        continue;
      }

      const forum: ForumChannel = (await guild.channels.cache.get(
        forumId,
      )) as ForumChannel;
      if (!forum) {
        console.error(`No forum found`);
        continue;
      }

      // Logic for posting to forum
      await this.postHomeworkToForum(work, forum, guild, utils);
    }

    const endTime = Date.now();
    interaction.editReply(`Processing completed [${endTime - startTime}ms].`);
    console.info(`Processing assignments took: ${endTime - startTime}ms`);
    utils.edupage.exit();
  }

  private async postHomeworkToForum(
    work: any,
    forum: ForumChannel,
    guild: any,
    utils: EdupageUtils,
  ) {
    if (work.testId == undefined) {
      const title =
        work.title.length > 100 ? work.title.substring(0, 99) : work.title;

      const embed = new EmbedBuilder()
        .setTitle("About")
        .addFields([
          { name: "SuperID", value: work.superId, inline: true },
          { name: "Author", value: work.owner.name, inline: true },
          { name: "Title", value: work.title },
          { name: "Subject", value: work.subject.name, inline: true },
          { name: "Type", value: work.type, inline: true },
        ])
        .setColor("Blurple");

      const noIdForum = await forum.threads.create({
        name: title,
        message: { embeds: [embed] },
      });
      await client.prisma.lynxHomeworkExists.create({
        data: {
          superID: work.superId,
          title: work.title,
          forumChannelID: noIdForum.id,
          forumID: forum.id,
          guilID: guild.id,
        },
      });
      return;
    }

    const materialData = await utils.getMaterial(work);

    if (!materialData) {
      console.warn(`No materialData... continuing`);
      return;
    }

    const title =
      work.title.length > 100 ? work.title.substring(0, 99) : work.title;

    const embed = new EmbedBuilder()
      .setTitle("About")
      .addFields([
        { name: "Id", value: `${materialData.testid}`, inline: true },
        { name: "SuperId", value: work.superId, inline: true },
        { name: "Author", value: work.owner.name, inline: true },
        { name: "Title", value: work.title },
        {
          name: "CardIds",
          value: `[${materialData.cardids
            .map((id: string) => `"${id}"`)
            .join(", ")}]`,
        },
        { name: "Time", value: materialData.timestamp.split(" ")[0] },
      ])
      .setColor("Blurple");

    console.info(`Creating forum Thread for ${work.title}`);
    const forumChan: ThreadChannel | null = await forum.threads
      .create({
        name: title,
        message: { embeds: [embed] },
      })
      .catch((err) => {
        console.error(`Error creating forum: ${err}`);
        return null;
      });

    if (!forumChan) {
      console.error(`No forumChan... continuing`);
      return;
    }

    const messageChannel = guild.channels.cache.get(
      forumChan.id,
    ) as TextChannel;
    const text: string[] = [];
    const files: { src: string; name: string }[] = [];
    const videos: string[] = [];
    const images: { src: string; name: string }[] = [];

    for (const id of materialData.cardids) {
      // @ts-ignore
      const data = await materialData.cardsData[id];
      if (!data) {
        console.info(`No data for id: ${id}`);
        continue;
      }

      const homeworkData = await JSON.parse(data.content);
      for (const widget of homeworkData.widgets) {
        if (widget.widgetClass == "VideoETestWidget") {
          videos.push(utils.stripHtmlTags(widget.props.source.src));
          if (widget?.props?.files) {
            widget.props.files.map((obj: { src: string; name: string }) => {
              files.push({
                src: obj.src,
                name: obj.name,
              });
            });
          }
        }

        if (widget.widgetClass == "ElaborationETestWidget") {
          if (widget?.props?.files) {
            widget.props.files.map((obj: { src: string; name: string }) => {
              files.push({
                src: obj.src,
                name: obj.name,
              });
            });
          }
        }

        if (widget.widgetClass == "FileETestWidget") {
          files.push(
            ...widget.props.files.map((file: { src: string; name: string }) => {
              return {
                src: file.src,
                name: `${Math.random()}file_${file.name}`,
              };
            }),
          );
        }

        if (widget.widgetClass == "ImageETestWidget") {
          images.push(
            ...widget.props.src.map((img: { src: string; name: string }) => {
              return {
                src: img.src,
                name: `${Math.random()}img_${img.name}`,
              };
            }),
          );
        }

        if (widget.widgetClass == "TextETestWidget") {
          const htmlText = utils.stripHtmlTags(widget.props.htmlText);
          const strippedParsedText = utils.stripHtmlTags(
            widget.props._parsedHtmlText,
          );

          if (widget?.props?.files) {
            widget.props.files.map((obj: { src: string; name: string }) => {
              files.push({
                src: obj.src,
                name: obj.name,
              });
            });
          }

          if (htmlText != undefined && htmlText.trim() !== "") {
            text.push(htmlText);
          }

          if (
            strippedParsedText != undefined &&
            strippedParsedText.trim() !== ""
          ) {
            text.push(strippedParsedText);
          }
        }
      }
    }

    for (const str of utils.removeDuplicateYouTubeLinks([...text, ...videos])) {
      if (str.length === 0) continue;

      await messageChannel
        .send({ content: htmlToText(str, { wordwrap: false }) })
        .catch((err) => {
          console.error(`Error sending message: ${err}`);
          return;
        });
    }

    // Download helper
    const downloadAndSend = async (
      fileList: { src: string; name: string }[],
    ) => {
      for (const file of fileList) {
        const fileUrl = "https://sps-snina.edupage.org" + file.src;
        try {
          await download(fileUrl, "./", { filename: file.name });
          await messageChannel
            .send({ files: [{ attachment: `./${file.name}` }] })
            .then(() => {
              fs.unlinkSync(`./${file.name}`);
            });
        } catch (err) {
          console.error(`Error sending Attachment: ${err}`);
        }
      }
    };

    await downloadAndSend(files);
    await downloadAndSend(images);

    await client.prisma.lynxHomeworkExists.create({
      data: {
        superID: work.superId,
        title: work.title,
        forumChannelID: forumChan.id,
        forumID: forum.id,
        guilID: guild.id,
      },
    });
  }
}
