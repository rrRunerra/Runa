import {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
} from "discord.js";
import fs from "fs";
import path from "path";
import ytdlp from "yt-dlp-exec";

import { client } from "../../index";
import { Command } from "../../structures/Command";

interface YtdlpFormat {
  format_id: string;
  filesize?: number;
  filesize_approx?: number;
  height?: number;
  width?: number;
  vcodec?: string;
  acodec?: string;
  ext?: string;
  url?: string;
  tbr?: number;
}

interface YtdlpThumbnail {
  url?: string;
  id?: string;
  width?: number;
  height?: number;
  resolution?: string;
}

interface YtdlpInfo {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  webpage_url?: string;
  thumbnail?: string;
  thumbnails?: YtdlpThumbnail[];
  like_count?: number;
  comment_count?: number;
  filesize?: number;
  filesize_approx?: number;
  tbr?: number;
  duration?: number;
  formats?: YtdlpFormat[];
  _type?: string;
  entries?: YtdlpInfo[];
  vcodec?: string;
  acodec?: string;
}

interface CobaltSuccessResponse {
  status: "redirect" | "tunnel" | "stream";
  url: string;
  filename?: string;
}

interface CobaltPickerItem {
  url: string;
  type?: "photo" | "video" | "gif";
  thumb?: string;
}

interface CobaltPickerResponse {
  status: "picker";
  picker: CobaltPickerItem[];
}

interface CobaltErrorResponse {
  status: "error";
  error: {
    code: string;
    context?: string;
  };
}

type CobaltResponse = CobaltSuccessResponse | CobaltPickerResponse | CobaltErrorResponse;

interface PlatformInfo {
  name: string;
  color: number;
  icon: string;
}

function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "N/A";
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return num.toString();
}

function isTikTokUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === "tiktok.com" || host.endsWith(".tiktok.com");
  } catch {
    return false;
  }
}

function isInstagramUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === "instagram.com" || host.endsWith(".instagram.com");
  } catch {
    return false;
  }
}

function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host.endsWith(".youtu.be")
    );
  } catch {
    return false;
  }
}

function getPlatformInfo(url: string): PlatformInfo {
  if (isTikTokUrl(url)) {
    return {
      name: "TikTok",
      color: 0xEE1D52,
      icon: "🎵",
    };
  }
  if (isInstagramUrl(url)) {
    return {
      name: "Instagram",
      color: 0xC13584,
      icon: "📸",
    };
  }
  if (isYouTubeUrl(url)) {
    return {
      name: "YouTube",
      color: 0xFF0000,
      icon: "🎥",
    };
  }
  return {
    name: "Video Sharing",
    color: 0x5865F2,
    icon: "🎥",
  };
}

function getGuildUploadLimit(guild: Guild | null): number {
  if (!guild) return 26214400; // 25MB default for DMs
  const tier = guild.premiumTier;
  const tierStr = String(tier);
  if (tierStr.includes("3") || tier === 3) {
    return 104857600; // 100MB
  }
  if (tierStr.includes("2") || tier === 2) {
    return 52428800; // 50MB
  }
  return 26214400; // 25MB for NONE and TIER_1
}

async function normalizeUrl(url: string): Promise<string> {
  let targetUrl = url;
  
  if (isTikTokUrl(url)) {
    try {
      let res = await globalThis.fetch(url, {
        method: "HEAD",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
      });
      
      if (!res.ok) {
        res = await globalThis.fetch(url, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          }
        });
      }
      
      targetUrl = res.url;
    } catch (err: unknown) {
      // Fallback to original url
    }
  }

  if (isTikTokUrl(targetUrl) && targetUrl.includes("/photo/")) {
    targetUrl = targetUrl.replace("/photo/", "/video/");
  }

  return targetUrl;
}

interface TikwmResponse {
  code: number;
  msg: string;
  data?: {
    id: string;
    title?: string;
    cover?: string;
    play?: string;
    size?: number;
    digg_count?: number;
    comment_count?: number;
    images?: string[];
  };
}

async function tryTikwm(
  url: string,
  limit: number,
  folder: string,
  interactionId: string
): Promise<{ info: YtdlpInfo; files: string[] } | null> {
  try {
    const apiURL = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const res = await globalThis.fetch(apiURL);
    if (!res.ok) return null;

    const body = await res.json() as TikwmResponse;
    if (body.code !== 0 || !body.data) return null;

    const data = body.data;
    const info: YtdlpInfo = {
      id: data.id,
      title: data.title || "TikTok Post",
      description: data.title,
      thumbnail: data.cover,
      like_count: data.digg_count,
      comment_count: data.comment_count,
    };

    const files: string[] = [];
    let accumulatedSize = 0;

    if (data.images && data.images.length > 0) {
      for (let imgIdx = 0; imgIdx < data.images.length; imgIdx++) {
        const imgUrl = data.images[imgIdx];
        const remainingLimit = limit - accumulatedSize;
        if (remainingLimit <= 0) break;

        const ext = imgUrl.toLowerCase().includes(".png") ? ".png" : ".jpg";
        const uniqueId = `${Date.now()}_${interactionId}_img_tikwm_${imgIdx}`;
        const outputFileName = `image_${uniqueId}${ext}`;
        const outputPath = path.join(folder, outputFileName);

        try {
          const imgRes = await globalThis.fetch(imgUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
          });
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            fs.writeFileSync(outputPath, globalThis.Buffer.from(arrayBuffer));
            const stats = fs.statSync(outputPath);
            if (stats.size > 0 && accumulatedSize + stats.size <= limit) {
              files.push(outputPath);
              accumulatedSize += stats.size;
            } else {
              fs.unlinkSync(outputPath);
            }
          }
        } catch (err: unknown) {
          console.error(`Failed to download TikWM slide ${imgIdx}:`, err);
        }
      }
    } else if (data.play) {
      const videoSize = data.size || 0;
      if (videoSize > 0 && videoSize > limit) {
        return null;
      }

      const uniqueId = `${Date.now()}_${interactionId}_video_tikwm`;
      const outputFileName = `video_${uniqueId}.mp4`;
      const outputPath = path.join(folder, outputFileName);

      try {
        const videoRes = await globalThis.fetch(data.play, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          }
        });
        if (videoRes.ok) {
          const arrayBuffer = await videoRes.arrayBuffer();
          fs.writeFileSync(outputPath, globalThis.Buffer.from(arrayBuffer));
          const stats = fs.statSync(outputPath);
          if (stats.size > 0 && stats.size <= limit) {
            files.push(outputPath);
          } else {
            fs.unlinkSync(outputPath);
          }
        }
      } catch (err: unknown) {
        console.error(`Failed to download TikWM video:`, err);
        return null;
      }
    }

    if (files.length > 0) {
      return { info, files };
    }
  } catch (err: unknown) {
    console.error("TikWM API error:", err);
  }
  return null;
}

async function tryCobalt(
  url: string,
  limit: number,
  folder: string,
  interactionId: string
): Promise<{ files: string[] } | null> {
  const apis: string[] = [
    "https://apicobalt.mgytr.top",
    "https://api.cobalt.blackcat.sweeux.org",
    "https://api.cobalt.liubquanti.click"
  ];

  for (const api of apis) {
    try {
      const res = await globalThis.fetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          url,
        }),
      });

      if (!res.ok) continue;

      const data = (await res.json()) as CobaltResponse;
      if (data.status === "error") {
        console.error(`Cobalt API ${api} returned error:`, data.error);
        continue;
      }

      const files: string[] = [];
      let accumulatedSize = 0;

      if (data.status === "tunnel" || data.status === "redirect" || data.status === "stream") {
        const mediaUrl = data.url;
        if (!mediaUrl) continue;

        const uniqueId = `${Date.now()}_${interactionId}_cobalt_single`;
        const filename = data.filename || "";
        const ext = filename.includes(".") ? filename.substring(filename.lastIndexOf(".")) : ".jpg";
        const outputFileName = `media_${uniqueId}${ext}`;
        const outputPath = path.join(folder, outputFileName);

        try {
          const downloadRes = await globalThis.fetch(mediaUrl);
          if (downloadRes.ok) {
            const arrayBuffer = await downloadRes.arrayBuffer();
            fs.writeFileSync(outputPath, globalThis.Buffer.from(arrayBuffer));
            const stats = fs.statSync(outputPath);
            if (stats.size > 0 && stats.size <= limit) {
              files.push(outputPath);
              return { files };
            } else {
              if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }
          }
        } catch (err: unknown) {
          console.error(`Failed to download single media from Cobalt API ${api}:`, err);
        }
      } else if (data.status === "picker") {
        const pickerItems = data.picker || [];
        for (let idx = 0; idx < pickerItems.length; idx++) {
          const item = pickerItems[idx];
          const mediaUrl = item.url;
          if (!mediaUrl) continue;

          const remainingLimit = limit - accumulatedSize;
          if (remainingLimit <= 0) break;

          const uniqueId = `${Date.now()}_${interactionId}_cobalt_picker_${idx}`;
          const ext = item.type === "video" ? ".mp4" : (item.type === "gif" ? ".gif" : ".jpg");
          const outputFileName = `media_${uniqueId}${ext}`;
          const outputPath = path.join(folder, outputFileName);

          try {
            const downloadRes = await globalThis.fetch(mediaUrl);
            if (downloadRes.ok) {
              const arrayBuffer = await downloadRes.arrayBuffer();
              fs.writeFileSync(outputPath, globalThis.Buffer.from(arrayBuffer));
              const stats = fs.statSync(outputPath);
              if (stats.size > 0 && accumulatedSize + stats.size <= limit) {
                files.push(outputPath);
                accumulatedSize += stats.size;
              } else {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
              }
            }
          } catch (err: unknown) {
            console.error(`Failed to download picker item ${idx} from Cobalt API ${api}:`, err);
          }
        }

        if (files.length > 0) {
          return { files };
        }
      }
    } catch (err: unknown) {
      console.error(`Cobalt API error with ${api}:`, err);
    }
  }

  return null;
}

function estimateFormatSize(format: YtdlpFormat, duration: number | undefined): number | null {
  if (format.filesize) return format.filesize;
  if (format.filesize_approx) return format.filesize_approx;
  if (duration && format.tbr) {
    return Math.round((duration * format.tbr * 1000) / 8);
  }
  return null;
}

function estimateVideoSize(info: YtdlpInfo): number | null {
  if (info.filesize) return info.filesize;
  if (info.filesize_approx) return info.filesize_approx;
  if (info.duration && info.tbr) {
    return Math.round((info.duration * info.tbr * 1000) / 8);
  }
  return null;
}

function getChosenFormatSize(item: YtdlpInfo, formatId: string | null): number | null {
  if (!formatId) {
    return estimateVideoSize(item);
  }

  const formats = item.formats || [];
  const duration = item.duration;

  if (formatId === "worst") {
    let smallestSize: number | null = null;
    for (const f of formats) {
      const size = estimateFormatSize(f, duration);
      if (size !== null && size > 0) {
        if (smallestSize === null || size < smallestSize) {
          smallestSize = size;
        }
      }
    }
    return smallestSize;
  }

  if (formatId.includes("+")) {
    const parts = formatId.split("+");
    let totalSize = 0;
    for (const part of parts) {
      const format = formats.find((f) => f.format_id === part);
      if (format) {
        totalSize += estimateFormatSize(format, duration) || 0;
      }
    }
    return totalSize > 0 ? totalSize : null;
  }

  const format = formats.find((f) => f.format_id === formatId);
  return format ? estimateFormatSize(format, duration) : null;
}


async function getUrlSize(url: string, platformReferer?: string): Promise<number | null> {
  try {
    const headers: Record<string, string> = {
      Range: "bytes=0-0",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
    if (platformReferer) {
      headers["Referer"] = platformReferer;
    }
    const res = await globalThis.fetch(url, {
      method: "GET",
      headers,
    });
    const contentRange = res.headers.get("content-range");
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
  } catch (err: unknown) {
    console.error(`Failed to fetch head/range request for url ${url}:`, err);
  }
  return null;
}

function cleanTemporaryFile(filePath: string): void {
  const pathsToClean = [
    filePath,
    `${filePath}.part`,
    `${filePath}.ytdl`
  ];
  for (const p of pathsToClean) {
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch (err: unknown) {
        // Ignore
      }
    }
  }
}


function selectFormat(info: YtdlpInfo, limit: number): string | null {
  const formats: YtdlpFormat[] = info.formats || [];
  const duration = info.duration;

  const getFormatSize = (f: YtdlpFormat): number => {
    const size = estimateFormatSize(f, duration);
    return size !== null ? size : 0;
  };

  const combined = formats.filter(
    (f) => f.vcodec && f.vcodec !== "none" && f.acodec && f.acodec !== "none"
  );
  
  const videoOnly = formats.filter(
    (f) => f.vcodec && f.vcodec !== "none" && (!f.acodec || f.acodec === "none")
  );

  const audioOnly = formats.filter(
    (f) => (!f.vcodec || f.vcodec === "none") && f.acodec && f.acodec !== "none"
  );

  if (combined.length > 0) {
    combined.sort((a, b) => {
      const qA = a.height || a.tbr || 0;
      const qB = b.height || b.tbr || 0;
      return qB - qA;
    });

    for (const f of combined) {
      const size = getFormatSize(f);
      if (size > 0 && size <= limit) {
        return f.format_id;
      }
    }
  }

  if (videoOnly.length > 0 && audioOnly.length > 0) {
    videoOnly.sort((a, b) => (b.height || 0) - (a.height || 0));
    audioOnly.sort((a, b) => (b.tbr || 0) - (a.tbr || 0));

    const bestAudio = audioOnly[0];
    const audioSize = getFormatSize(bestAudio);

    for (const v of videoOnly) {
      const videoSize = getFormatSize(v);
      if (videoSize + audioSize <= limit) {
        return `${v.format_id}+${bestAudio.format_id}`;
      }
    }
    
    const worstAudio = audioOnly[audioOnly.length - 1];
    const worstAudioSize = getFormatSize(worstAudio);
    for (const v of videoOnly) {
      const videoSize = getFormatSize(v);
      if (videoSize + worstAudioSize <= limit) {
        return `${v.format_id}+${worstAudio.format_id}`;
      }
    }
  }

  if (formats.length > 0) {
    return "worst";
  }

  return null;
}

export default class VideoCommand extends Command {
  constructor() {
    super({
      name: "video",
      description: "Sends a video from TikTok, Instagram, or YouTube Shorts.",
      category: "Misc",
      allowDm: true,
      clientPermissions: ["SendMessages", "AttachFiles", "EmbedLinks"],
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
Download and send videos from TikTok, Instagram, and YouTube Shorts.

### Usage
\`/video <url>\`

### Details
- Automatically checks the server's upload size limits before downloading.
- If the best quality exceeds limits, falls back to lower quality resolutions.
- Sends a rich embed containing video description, likes, comments, and the original link.
- Supports carousels and playlists by sending as many files as fit under the upload size limit.`,
    });
  }

  public async slashCommandExecute(interaction: ChatInputCommandInteraction): Promise<void> {
    const rawUrl = interaction.options.getString("url")!;
    await interaction.deferReply();

    const url = await normalizeUrl(rawUrl);

    const folder = path.join(process.cwd(), "storage", "video");

    try {
      fs.mkdirSync(folder, { recursive: true });
    } catch (dirErr: unknown) {
      this.logger.error(`Failed to create storage directory: ${dirErr}`);
      await interaction.editReply("Could not create download directory. Check bot permissions.");
      return;
    }

    const platform = getPlatformInfo(url);
    const limit = getGuildUploadLimit(interaction.guild);

    if (isTikTokUrl(url)) {
      const tikwmResult = await tryTikwm(url, limit, folder, interaction.id);
      if (tikwmResult) {
        const { info: tikwmInfo, files: tikwmFiles } = tikwmResult;
        const displayInfo = tikwmInfo;
        const title = displayInfo.title || "Social Media Video";
        const descriptionText = displayInfo.description
          ? (displayInfo.description.length > 500 ? `${displayInfo.description.substring(0, 497)}...` : displayInfo.description)
          : "No description provided.";

        const embed = new EmbedBuilder()
          .setColor(platform.color)
          .setTitle(`${platform.icon} ${title}`)
          .setURL(url)
          .setDescription(`${descriptionText}\n\n🔗 [Original Video Link](${url})`)
          .setTimestamp()
          .setFooter({
            text: `Requested by ${interaction.user.username} • via ${platform.name}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        if (displayInfo.thumbnail) {
          embed.setThumbnail(displayInfo.thumbnail);
        }

        embed.addFields(
          {
            name: "❤️ Likes",
            value: formatNumber(displayInfo.like_count),
            inline: true,
          },
          {
            name: "💬 Comments",
            value: formatNumber(displayInfo.comment_count),
            inline: true,
          }
        );

        try {
          const attachments = tikwmFiles.map((filePath, index) => {
            const ext = path.extname(filePath);
            const namePrefix = filePath.includes("image_") ? "image" : "video";
            return {
              attachment: filePath,
              name: `${namePrefix}_${index}${ext}`,
            };
          });

          await interaction.editReply({
            embeds: [embed],
            files: attachments,
          });
        } catch (sendErr: unknown) {
          this.logger.error(`Failed to send response message via TikWM path: ${sendErr}`);
          await interaction.editReply("Failed to send the downloaded video to the channel.");
        } finally {
          for (const filePath of tikwmFiles) {
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (cleanupErr: unknown) {
                this.logger.error(`Failed to delete temporary TikWM file ${filePath}: ${cleanupErr}`);
              }
            }
          }
        }
        return;
      }
    }

    let rawInfo: unknown;
    let isInstagramCobaltFallback = false;
    let instagramCobaltFiles: string[] = [];

    try {
      rawInfo = await ytdlp(url, {
        dumpSingleJson: true,
        noWarnings: true,
      });
    } catch (err: unknown) {
      const errStr = String(err);
      this.logger.error(`Failed to fetch video info: ${err}`);

      if (isInstagramUrl(url)) {
        this.logger.log("yt-dlp failed for Instagram, trying Cobalt API fallback...");
        const cobaltResult = await tryCobalt(url, limit, folder, interaction.id);
        if (cobaltResult && cobaltResult.files.length > 0) {
          isInstagramCobaltFallback = true;
          instagramCobaltFiles = cobaltResult.files;
        } else {
          if (errStr.includes("There is no video in this post")) {
            const embed = new EmbedBuilder()
              .setColor(platform.color)
              .setTitle(`${platform.icon} Instagram Post`)
              .setURL(url)
              .setDescription(`🔗 [Original Post Link](${url})\n\n⚠️ Instagram image/carousel posts cannot be attached directly because download scrapers are currently unavailable.`)
              .setTimestamp()
              .setFooter({
                text: `Requested by ${interaction.user.username} • via ${platform.name}`,
                iconURL: interaction.user.displayAvatarURL(),
              });

            await interaction.editReply({
              embeds: [embed],
            });
            return;
          }

          await interaction.editReply("Failed to fetch video information. Please verify the URL is correct and public.");
          return;
        }
      } else {
        await interaction.editReply("Failed to fetch video information. Please verify the URL is correct and public.");
        return;
      }
    }

    if (isInstagramCobaltFallback) {
      const embed = new EmbedBuilder()
        .setColor(platform.color)
        .setTitle(`${platform.icon} Instagram Post`)
        .setURL(url)
        .setDescription(`🔗 [Original Post Link](${url})`)
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.username} • via ${platform.name}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      try {
        const attachments = instagramCobaltFiles.map((filePath, index) => {
          const ext = path.extname(filePath);
          const namePrefix = filePath.includes("image_") || filePath.includes("media_") ? "media" : "video";
          return {
            attachment: filePath,
            name: `${namePrefix}_${index}${ext}`,
          };
        });

        await interaction.editReply({
          embeds: [embed],
          files: attachments,
        });
      } catch (sendErr: unknown) {
        this.logger.error(`Failed to send response message via Instagram Cobalt fallback: ${sendErr}`);
        await interaction.editReply("Failed to send the downloaded media to the channel.");
      } finally {
        for (const filePath of instagramCobaltFiles) {
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (cleanupErr: unknown) {
              this.logger.error(`Failed to delete temporary Cobalt file ${filePath}: ${cleanupErr}`);
            }
          }
        }
      }
      return;
    }

    if (!rawInfo) {
      await interaction.editReply("No video details found for the provided URL.");
      return;
    }

    const info = rawInfo as YtdlpInfo;
    const items = info.entries && info.entries.length > 0 ? info.entries : [info];
    const downloadedFiles: string[] = [];
    let accumulatedSize = 0;
    let sizeExceeded = false;
    let maxEstimatedSize = 0;

    const downloadMedia = async (
      mediaUrl: string,
      outputPath: string,
      currentLimit: number,
      formatId: string | null,
      playlistIndex?: number
    ): Promise<void> => {
      const options: Record<string, unknown> = {
        output: outputPath,
        noWarnings: true,
        restrictFilenames: true,
        maxFilesize: `${currentLimit}`,
      };

      if (playlistIndex !== undefined) {
        options.playlistItems = String(playlistIndex + 1);
      } else {
        options.noPlaylist = true;
      }

      if (formatId) {
        options.format = formatId;
      }

      await ytdlp(mediaUrl, options);
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const remainingLimit = limit - accumulatedSize;
      if (remainingLimit <= 0) {
        break;
      }

      // Check if this item is a photo post (no video codec available)
      const isPhoto = item.vcodec === "none" || (!item.vcodec && item.formats?.every((f) => f.vcodec === "none"));

      if (isPhoto) {
        const imageUrls: string[] = [];
        const thumbnails = item.thumbnails || [];
        for (const t of thumbnails) {
          if (t.url && !imageUrls.includes(t.url)) {
            if (t.url.includes("photomode-image") || t.url.includes("photomode")) {
              imageUrls.push(t.url);
            }
          }
        }

        // Fallback to all unique thumbnails if no photomode images found
        if (imageUrls.length === 0) {
          for (const t of thumbnails) {
            if (t.url && !imageUrls.includes(t.url)) {
              imageUrls.push(t.url);
            }
          }
        }

        if (imageUrls.length > 0) {
          for (let imgIdx = 0; imgIdx < imageUrls.length; imgIdx++) {
            const imgUrl = imageUrls[imgIdx];
            const currentImgRemainingLimit = limit - accumulatedSize;
            if (currentImgRemainingLimit <= 0) {
              break;
            }

            const ext = imgUrl.toLowerCase().includes(".png") ? ".png" : ".jpg";
            const uniqueId = `${Date.now()}_${interaction.id}_img_${i}_${imgIdx}`;
            const outputFileName = `image_${uniqueId}${ext}`;
            const outputPath = path.join(folder, outputFileName);

            let downloadSuccess = false;
            try {
              const res = await globalThis.fetch(imgUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                }
              });
              if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                fs.writeFileSync(outputPath, globalThis.Buffer.from(arrayBuffer));
                downloadSuccess = true;
              } else {
                this.logger.error(`Failed to download image ${imgIdx} (HTTP ${res.status})`);
              }
            } catch (err: unknown) {
              this.logger.error(`Failed to download slideshow image ${imgIdx} for item ${i}: ${err}`);
            }

            if (downloadSuccess && fs.existsSync(outputPath)) {
              const stats = fs.statSync(outputPath);
              if (stats.size > 0 && accumulatedSize + stats.size <= limit) {
                downloadedFiles.push(outputPath);
                accumulatedSize += stats.size;
              } else {
                try {
                  fs.unlinkSync(outputPath);
                } catch (cleanupErr: unknown) {
                  this.logger.error(`Failed to clean up image file over limit: ${cleanupErr}`);
                }
              }
            }
          }
          continue;
        }
      }

      const uniqueId = `${Date.now()}_${interaction.id}_${item.id || downloadedFiles.length}`;
      const outputFileName = `video_${uniqueId}.mp4`;
      const outputPath = path.join(folder, outputFileName);

      let estimatedSize = estimateVideoSize(item);
      if (!estimatedSize && item.url) {
        estimatedSize = await getUrlSize(item.url, url);
      }

      let selectedFormatId: string | null = null;
      if (estimatedSize && estimatedSize > remainingLimit) {
        selectedFormatId = selectFormat(item, remainingLimit);
      }

      // Check the size of the chosen format before starting download
      const chosenSize = getChosenFormatSize(item, selectedFormatId) || estimatedSize;
      if (chosenSize && chosenSize > remainingLimit) {
        this.logger.log(`Estimated size (${(chosenSize / (1024 * 1024)).toFixed(1)} MB) exceeds remaining limit (${(remainingLimit / (1024 * 1024)).toFixed(1)} MB). Skipping download.`);
        sizeExceeded = true;
        if (chosenSize > maxEstimatedSize) {
          maxEstimatedSize = chosenSize;
        }
        continue;
      }

      const playlistIndex = items.length > 1 ? i : undefined;
      const downloadUrl = url; // Use original page URL so yt-dlp uses the platform-specific extractor (handles headers, referer, cookies)

      let downloadSuccess = false;
      try {
        await downloadMedia(downloadUrl, outputPath, remainingLimit, selectedFormatId, playlistIndex);
        downloadSuccess = true;
      } catch (err: unknown) {
        const errStr = String(err);
        if (selectedFormatId !== "worst" && (errStr.includes("max-filesize") || errStr.includes("File is larger than"))) {
          this.logger.log(`Exceeded size limit for format ${selectedFormatId || "best"}. Retrying with worst quality...`);
          try {
            cleanTemporaryFile(outputPath);
            await downloadMedia(downloadUrl, outputPath, remainingLimit, "worst", playlistIndex);
            downloadSuccess = true;
          } catch (retryErr: unknown) {
            this.logger.error(`Retry with worst quality failed: ${retryErr}`);
          }
        } else {
          this.logger.error(`Download failed: ${err}`);
        }
      }

      if (downloadSuccess && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 0 && accumulatedSize + stats.size <= limit) {
          downloadedFiles.push(outputPath);
          accumulatedSize += stats.size;
        } else {
          cleanTemporaryFile(outputPath);
        }
      } else {
        cleanTemporaryFile(outputPath);
      }
    }

    if (downloadedFiles.length === 0) {
      if (isInstagramUrl(url)) {
        this.logger.log("yt-dlp failed to download Instagram video. Trying Cobalt API as fallback...");
        const cobaltResult = await tryCobalt(url, limit, folder, interaction.id);
        if (cobaltResult && cobaltResult.files.length > 0) {
          isInstagramCobaltFallback = true;
          instagramCobaltFiles = cobaltResult.files;
        }
      }

      if (!isInstagramCobaltFallback) {
        if (sizeExceeded && maxEstimatedSize > 0) {
          await interaction.editReply(
            `Failed to download video. The video size (estimated **${(maxEstimatedSize / (1024 * 1024)).toFixed(1)} MB**) exceeds the server's upload limit of **${(limit / (1024 * 1024)).toFixed(1)} MB**.`
          );
        } else {
          await interaction.editReply(
            `Failed to download video. The video size exceeds the server's upload limit of **${(limit / (1024 * 1024)).toFixed(1)} MB**.`
          );
        }
        return;
      }
    }

    const displayInfo = items[0] || info;
    const title = displayInfo.title || "Social Media Video";
    const descriptionText = displayInfo.description
      ? (displayInfo.description.length > 500 ? `${displayInfo.description.substring(0, 497)}...` : displayInfo.description)
      : "No description provided.";

    const embed = new EmbedBuilder()
      .setColor(platform.color)
      .setTitle(`${platform.icon} ${title}`)
      .setURL(url)
      .setDescription(`${descriptionText}\n\n🔗 [Original Video Link](${url})`)
      .setTimestamp()
      .setFooter({
        text: `Requested by ${interaction.user.username} • via ${platform.name}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    if (displayInfo.thumbnail) {
      embed.setThumbnail(displayInfo.thumbnail);
    }

    embed.addFields(
      {
        name: "❤️ Likes",
        value: formatNumber(displayInfo.like_count),
        inline: true,
      },
      {
        name: "💬 Comments",
        value: formatNumber(displayInfo.comment_count),
        inline: true,
      }
    );

    try {
      const filesToSend = isInstagramCobaltFallback ? instagramCobaltFiles : downloadedFiles;
      const attachments = filesToSend.map((filePath, index) => {
        const ext = path.extname(filePath);
        const namePrefix = filePath.includes("image_") || filePath.includes("media_") ? "media" : "video";
        return {
          attachment: filePath,
          name: `${namePrefix}_${index}${ext}`,
        };
      });

      await interaction.editReply({
        embeds: [embed],
        files: attachments,
      });
    } catch (sendErr: unknown) {
      this.logger.error(`Failed to send response message: ${sendErr}`);
      await interaction.editReply("Failed to send the downloaded video to the channel.");
    } finally {
      const filesToCleanup = isInstagramCobaltFallback ? instagramCobaltFiles : downloadedFiles;
      for (const filePath of filesToCleanup) {
        cleanTemporaryFile(filePath);
      }
    }
  }
}
