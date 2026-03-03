import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  PermissionFlagsBits,
  TextChannel,
  User,
  Role,
  Collection,
  MessageFlags,
} from "discord.js";
import { Command } from "../../structures/Command";
import { client } from "../../index";
import fs from "fs";
import path from "path";
import download from "download";

const errorEmbed = new EmbedBuilder()
  .setColor("Red")
  .setTimestamp()
  .setTitle("Error");

const successEmbed = new EmbedBuilder()
  .setColor("Green")
  .setTimestamp()
  .setTitle("Success");

export default class ClearCommand extends Command {
  constructor() {
    super({
      name: "clear",
      description: "Clear messages from the channel and archive them.",
      category: "Moderation",
      cooldown: 5,
      nsfw: false,
      clientPermissions: ["ManageMessages", "ReadMessageHistory"],
      userPermissions: ["ManageMessages"],
      dev: client.mode,
      enabled: true,
      cooldownFilteredUsers: [],
      serverOnly: [],
      userOnly: [],
      options: [
        {
          name: "amount",
          description: "Number of messages to clear (default 100, max 100)",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 1,
          maxValue: 100,
        },
        {
          name: "user",
          description: "Filter by user",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
        {
          name: "role",
          description: "Filter by role",
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
        {
          name: "bot",
          description: "Filter by bot messages",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
      allowDm: false,
      docs: `### Summary
Bulk delete messages and archive them to the database.

### Usage
\`/clear [amount] [filters]\`

### Details
- Default amount: 100. Max: 100.
- Filters: \`user\`, \`role\`, \`bot\`.
- **Note**: Ignores messages older than 14 days due to Discord limitations.
- All deleted messages are archived for later restoration.`,
    });
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel as TextChannel;

    if (!channel) {
      errorEmbed.setDescription("Could not resolve channel.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const amount = interaction.options.getInteger("amount") || 100;
    const userFilter = interaction.options.getUser("user");
    const roleFilter = interaction.options.getRole("role") as Role | null;
    const botFilter = interaction.options.getBoolean("bot");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const messages = await channel.messages.fetch({ limit: amount });
      let filteredMessages = messages;

      if (userFilter) {
        filteredMessages = filteredMessages.filter(
          (m) => m.author.id === userFilter.id,
        );
      }

      if (roleFilter) {
        filteredMessages = filteredMessages.filter((m) =>
          m.member?.roles.cache.has(roleFilter.id),
        );
      }

      if (botFilter !== null) {
        filteredMessages = filteredMessages.filter(
          (m) => m.author.bot === botFilter,
        );
      }

      const now = Date.now();
      const validForBulkDelete = filteredMessages.filter(
        (m) => now - m.createdTimestamp < 1209600000, // 14 days in ms
      );

      if (validForBulkDelete.size === 0) {
        errorEmbed.setDescription(
          "No messages found matching criteria that can be bulk deleted (must be < 14 days old).",
        );
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Create Batch Entry first to get ID
      const batch = await client.prisma.lynxClearBatch.create({
        data: {
          guildId: interaction.guildId!,
          channelId: channel.id,
          moderatorId: interaction.user.id,
        },
      });

      // Prepare storage
      const storageDir = path.join(
        process.cwd(),
        "storage",
        "attachments",
        batch.id,
      );
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const messagesData = await Promise.all(
        validForBulkDelete.map(async (m) => {
          let attachmentsData: any[] = [];
          if (m.attachments.size > 0) {
            await Promise.all(
              m.attachments.map(async (a) => {
                const filePath = path.join(storageDir, a.name);
                try {
                  await download(a.url, storageDir);
                  attachmentsData.push({
                    name: a.name,
                    url: a.url, // Keep original URL as backup
                    localPath: filePath,
                    contentType: a.contentType,
                  });
                } catch (err) {
                  console.error(`Failed to download ${a.url}`, err);
                  // Fallback to just URL if download fails
                  attachmentsData.push({
                    name: a.name,
                    url: a.url,
                    error: "Download failed",
                  });
                }
              }),
            );
          }

          return {
            batchId: batch.id,
            authorId: m.author.id,
            username: m.author.username,
            avatarUrl: m.author.avatarURL(),
            content: m.content,
            embeds: m.embeds as any,
            attachments:
              attachmentsData.length > 0
                ? JSON.stringify(attachmentsData)
                : undefined,
            timestamp: m.createdAt,
          };
        }),
      );

      // Bulk insert messages
      await client.prisma.lynxClearedMessage.createMany({
        data: messagesData,
      });

      // Delete messages from Discord
      await channel.bulkDelete(validForBulkDelete, true);

      successEmbed.setDescription(
        `Cleared ${validForBulkDelete.size} messages.\nBatch ID: \`${batch.id}\``,
      );
      return interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      console.error(error);
      errorEmbed.setDescription("An error occurred while clearing messages.");
      return interaction.editReply({ embeds: [errorEmbed] });
    }
  }
}
