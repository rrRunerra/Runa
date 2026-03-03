import { Command } from "../../structures/Command";
import { client } from "../../index";
import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
} from "discord.js";
import fs from "fs";
import ytdlp from "yt-dlp-exec";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class VideoCommand extends Command {
  constructor() {
    super({
      name: "video",
      description: "Sends a Video from tiktok, instagram.",
      category: "Misc",
      allowDm: true,
      clientPermissions: ["SendMessages", "AttachFiles"],
      cooldown: 30,
      cooldownFilteredUsers: [],
      userOnly: [],
      dev: client.mode,
      enabled: true,
      nsfw: false,
      serverOnly: [],
      userPermissions: ["SendMessages", "AttachFiles"],
      options: [
        {
          name: "url",
          description: "Video url",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      docs: `### Summary
Download and send videos from various social media platforms.

### Usage
\`/video <url>\`

### Details
- Supported platforms: TikTok, Instagram, Twitter/X, YouTube, etc.
- Uses \`yt-dlp\` for robust processing.
- Handles gallery/playlist detection.
- Automatically respects Discord's file size limits.`,
    });
  }

  public async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    const url = interaction.options.getString("url")!;
    await interaction.deferReply();

    let downloadedFilePath: string | null = null;

    try {
      // Use a simple, guaranteed-writable directory
      const folder = path.join(process.cwd(), "storage", "video");

      // Create directory with explicit verification
      try {
        fs.mkdirSync(folder, { recursive: true });
        if (!fs.existsSync(folder)) {
          throw new Error(`Failed to create: ${folder}`);
        }
      } catch (dirErr) {
        console.error(`Directory error: ${dirErr}`);
        await interaction.editReply(
          "Could not create download directory. Check bot permissions.",
        );
        return;
      }

      const uniqueId = `${Date.now()}_${interaction.id}`;
      // CRITICAL: Use a fixed filename - NO %(ext)s template
      const outputFileName = `video_${uniqueId}.mp4`;
      const outputPath = path.join(folder, outputFileName);

      console.info(`Downloading to: ${outputPath}`);

      // Download with simplified options
      await ytdlp(url, {
        output: outputPath, // Direct path, no template
        noWarnings: true,
        restrictFilenames: true,
        noPlaylist: true,
        maxFilesize: "10M",
      });

      // Verify file exists and has content
      if (!fs.existsSync(outputPath)) {
        throw new Error(
          "Download failed - file not created at expected location",
        );
      }

      const stats = fs.statSync(outputPath);
      if (stats.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      downloadedFilePath = outputPath;

      // Send the video
      await interaction.editReply({
        files: [{ attachment: downloadedFilePath, name: "video.mp4" }],
      });
    } catch (err: any) {
      console.error(`Download failed: ${err}`);
      await interaction.editReply(`Failed to download video.`);
    } finally {
      // Cleanup
      if (downloadedFilePath && fs.existsSync(downloadedFilePath)) {
        try {
          fs.unlinkSync(downloadedFilePath);
        } catch (cleanupErr) {
          console.error(`Cleanup failed: ${cleanupErr}`);
        }
      }
    }
  }
}
