import {
  ApplicationCommandOptionType,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  TextChannel,
  WebhookClient,
} from "discord.js";
import { Command } from "../../structures/Command";
import { client } from "../../index";
import fs from "fs";
import path from "path";

const errorEmbed = new EmbedBuilder()
  .setColor("Red")
  .setTimestamp()
  .setTitle("Error");

const successEmbed = new EmbedBuilder()
  .setColor("Green")
  .setTimestamp()
  .setTitle("Success");

export default class RestoreCommand extends Command {
  constructor() {
    super({
      name: "restore",
      description: "Restore messages from a previous clear batch.",
      category: "Moderation",
      cooldown: 10,
      nsfw: false,
      clientPermissions: ["ManageWebhooks", "ManageMessages"],
      userPermissions: ["ManageMessages"],
      dev: client.mode,
      enabled: true,
      cooldownFilteredUsers: [],
      serverOnly: [],
      userOnly: [],
      options: [
        {
          name: "batch",
          description: "The batch ID to restore",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
        {
          name: "keep",
          description:
            "Keep the batch in database after restoring (default: false)",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
      allowDm: false,
      docs: `### Summary
Restore archived messages via Webhook.

### Usage
\`/restore <batch_id> [keep]\`

### Details
- Re-creates author attribution using webhooks.
- \`keep\`: If true, the batch is not deleted from the database after restoration.
- Supports restoring attachments from local storage.`,
    });
  }
  async autoComplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();

    // Fetch recent batches for this channel
    const batches = await client.prisma.lynxClearBatch.findMany({
      where: {
        channelId: interaction.channelId,
        id: { contains: focusedValue },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
      include: {
        messages: {
          select: {
            id: true,
          },
        },
      },
    });

    await interaction.respond(
      batches.map((batch) => ({
        name: `${batch.createdAt.toLocaleString()} - ${batch.messages.length} msgs (ID: ${batch.id})`,
        value: batch.id,
      })),
    );
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const batchId = interaction.options.getString("batch", true);
    const keep = interaction.options.getBoolean("keep") || false;
    const channel = interaction.channel as TextChannel;

    if (!channel) {
      errorEmbed.setDescription("Could not resolve channel.");
      return interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const batch = await client.prisma.lynxClearBatch.findUnique({
        where: { id: batchId },
        include: {
          messages: {
            orderBy: {
              timestamp: "asc", // Restore in original order
            },
          },
        },
      });

      if (!batch) {
        errorEmbed.setDescription("Batch not found.");
        return interaction.editReply({ embeds: [errorEmbed] });
      }

      // Create or reuse webhook
      let webhook = (await channel.fetchWebhooks()).find(
        (w) => w.name === "Lynx Restore" && w.owner?.id === client.user?.id,
      );
      if (!webhook) {
        webhook = await channel.createWebhook({
          name: "Lynx Restore",
          avatar: client.user?.displayAvatarURL(),
        });
      }

      // Iterate and send
      let restoredCount = 0;
      for (const msg of batch.messages) {
        try {
          const files = [];
          if (msg.attachments) {
            const storedAttachments = JSON.parse(msg.attachments as string);
            for (const att of storedAttachments) {
              // Determine source: local path preference, then URL
              if (att.localPath && fs.existsSync(att.localPath)) {
                files.push({
                  attachment: att.localPath,
                  name: att.name,
                });
              } else if (att.url) {
                files.push({
                  attachment: att.url,
                  name: att.name,
                });
              }
            }
          }

          await webhook.send({
            content: msg.content || undefined,
            username: msg.username,
            avatarURL: msg.avatarUrl || undefined,
            embeds: msg.embeds as any,
            files: files.length > 0 ? files : undefined,
            allowedMentions: { parse: [] },
          });
          restoredCount++;
          // basic delay
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          console.error(`Failed to restore message ${msg.id}:`, e);
        }
      }

      if (!keep) {
        await client.prisma.lynxClearBatch.delete({ where: { id: batch.id } });

        // Clean up local files
        const storageDir = path.join(
          process.cwd(),
          "storage",
          "attachments",
          batch.id,
        );
        if (fs.existsSync(storageDir)) {
          fs.rmSync(storageDir, { recursive: true, force: true });
        }
      }

      successEmbed.setDescription(
        `Successfully restored ${restoredCount} messages from batch \`${batch.id}\`${!keep ? " and deleted the batch" : ""}.`,
      );
      return interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      console.error(error);
      errorEmbed.setDescription("An error occurred while restoring messages.");
      return interaction.editReply({ embeds: [errorEmbed] });
    }
  }
}
