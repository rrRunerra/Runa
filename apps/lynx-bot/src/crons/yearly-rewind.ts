import { Cron } from "../structures/Cron";
import { LynxClient } from "../client/client";
import { rewindBuffer } from "../services/rewindBufferService";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";

export default class YearlyRewindCron extends Cron {
  private lastExecutedYear: number | null = null;

  constructor(client: LynxClient) {
    super({
      name: "yearly-rewind",
      description: "Automatically posts the Yearly Rewind announcement in every server on December 31 at 11:59 PM.",
      enabled: true,
      repeatTime: 60000, // Check every minute
      excludeRunOnStart: true,
      docs: "Triggers on Dec 31 at 23:59 to post server rewind statistics and invite members to run /rewind.",
    });
  }

  public async cronExecute(): Promise<void> {
    const now = new Date();
    const month = now.getMonth(); // 11 = December (0-indexed)
    const date = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const year = now.getFullYear();

    // Check if it's Dec 31, 23:59 (11:59 PM) and hasn't executed for this year yet
    if (month !== 11 || date !== 31 || hours !== 23 || minutes !== 59) return;
    if (this.lastExecutedYear === year) return;

    this.lastExecutedYear = year;
    this.logger.log(`Starting December 31 Yearly Rewind broadcast for ${year}...`);

    // Ensure all pending stats are flushed to DB first
    await rewindBuffer.flushToDatabase();

    for (const [guildId, guild] of this.client.guilds.cache.entries()) {
      try {
        const config = await this.client.prisma.lynxRewindConfig.findUnique({
          where: { guildId },
        });

        if (config?.enabled === false) continue;

        let targetChannel: TextChannel | null = null;

        if (config?.announcementChannelId) {
          const ch = await guild.channels.fetch(config.announcementChannelId).catch(() => null);
          if (ch && ch.isTextBased()) targetChannel = ch as TextChannel;
        }

        if (!targetChannel) {
          if (guild.systemChannel && guild.systemChannel.isTextBased()) {
            targetChannel = guild.systemChannel as TextChannel;
          } else {
            const generalCh = guild.channels.cache.find(
              (c) => c.isTextBased() && (c.name.includes("general") || c.name.includes("chat") || c.name.includes("main"))
            );
            if (generalCh) targetChannel = generalCh as TextChannel;
          }
        }

        if (!targetChannel) continue;

        // Fetch top server stats for the year
        const topMembers = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year },
          orderBy: { messagesSent: "desc" },
          take: 5,
        });

        const topVcMembers = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year, totalVoiceSeconds: { gt: 0 } },
          orderBy: { totalVoiceSeconds: "desc" },
          take: 5,
        });

        const mostOnlineList = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year, onlineSeconds: { gt: 0 } },
          orderBy: { onlineSeconds: "desc" },
          take: 5,
        });

        const mostIdleList = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year, idleSeconds: { gt: 0 } },
          orderBy: { idleSeconds: "desc" },
          take: 5,
        });

        const mostDndList = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year, dndSeconds: { gt: 0 } },
          orderBy: { dndSeconds: "desc" },
          take: 5,
        });

        const topStreamers = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year, streamingSeconds: { gt: 0 } },
          orderBy: { streamingSeconds: "desc" },
          take: 5,
        });

        const topCameraUsers = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year, cameraSeconds: { gt: 0 } },
          orderBy: { cameraSeconds: "desc" },
          take: 5,
        });

        const topGamers = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year, topGameSeconds: { gt: 0 } },
          orderBy: { topGameSeconds: "desc" },
          take: 5,
        });

        const topSpotifyListeners = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year, spotifySeconds: { gt: 0 } },
          orderBy: { spotifySeconds: "desc" },
          take: 5,
        });

        const topInviters = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year, invitesCount: { gt: 0 } },
          orderBy: { invitesCount: "desc" },
          take: 5,
        });

        const topCmdUsers = await this.client.prisma.lynxUserYearlyStats.findMany({
          where: { guildId, year, commandsUsed: { gt: 0 } },
          orderBy: { commandsUsed: "desc" },
          take: 5,
        });

        const totalMessages = await this.client.prisma.lynxUserYearlyStats.aggregate({
          where: { guildId, year },
          _sum: {
            messagesSent: true,
            messagesEdited: true,
            messagesDeleted: true,
            totalWordCount: true,
            totalVoiceSeconds: true,
            commandsUsed: true,
            reactionsAdded: true,
            attachmentsSent: true,
            mediaCount: true,
            streamingSeconds: true,
            cameraSeconds: true,
            spotifySeconds: true,
          },
        });

        const msgCount = totalMessages._sum.messagesSent || 0;
        const msgEdited = totalMessages._sum.messagesEdited || 0;
        const msgDeleted = totalMessages._sum.messagesDeleted || 0;
        const totalWords = totalMessages._sum.totalWordCount || BigInt(0);

        const vcHours = Math.round((totalMessages._sum.totalVoiceSeconds || 0) / 3600);
        const streamHours = Math.round((totalMessages._sum.streamingSeconds || 0) / 3600);
        const cameraHours = Math.round((totalMessages._sum.cameraSeconds || 0) / 3600);
        const spotifyHours = Math.round((totalMessages._sum.spotifySeconds || 0) / 3600);

        const cmdCount = totalMessages._sum.commandsUsed || 0;
        const reactionCount = totalMessages._sum.reactionsAdded || 0;
        const mediaTotal = (totalMessages._sum.attachmentsSent || 0) + (totalMessages._sum.mediaCount || 0);

        const formatHrs = (sec: number) => (sec / 3600).toFixed(1);

        const formatTopList = (list: any[], formatFn: (item: any) => string) => {
          return list.length > 0
            ? list.map((item, i) => `${i === 0 ? "👑" : `${i + 1}.`} ${formatFn(item)}`).join("\n")
            : "None";
        };

        const embed = new EmbedBuilder()
          .setTitle(`🎉 ${guild.name}'s ${year} Yearly Rewind! 🎉`)
          .setThumbnail(guild.iconURL() || this.client.user?.displayAvatarURL() || "")
          .setDescription(`What an incredible year! Here is a comprehensive look back at how **${guild.name}** performed in **${year}**!`)
          .addFields(
            {
              name: "📊 Server Summary Totals",
              value:
                `💬 **Messages Sent:** ${msgCount.toLocaleString()} (✏️ ${msgEdited.toLocaleString()} edited | 🗑️ ${msgDeleted.toLocaleString()} deleted)\n` +
                `📝 **Words Written:** ${totalWords.toLocaleString()}\n` +
                `🎙️ **Voice Hours:** ${vcHours.toLocaleString()} hrs (📺 Streams: ${streamHours} hrs | 🎥 Camera: ${cameraHours} hrs)\n` +
                `🎵 **Spotify Hours:** ${spotifyHours.toLocaleString()} hrs\n` +
                `📷 **Files Uploaded:** ${mediaTotal.toLocaleString()}\n` +
                `⚡ **Commands Run:** ${cmdCount.toLocaleString()}\n` +
                `🔥 **Reactions Added:** ${reactionCount.toLocaleString()}`,
              inline: false,
            },
            { name: "👑 Top 5 Chatters", value: formatTopList(topMembers, (m) => `<@${m.userId}> - ${m.messagesSent.toLocaleString()} msgs`), inline: true },
            { name: "🎙️ Top 5 Voice Legends", value: formatTopList(topVcMembers, (m) => `<@${m.userId}> - ${formatHrs(m.totalVoiceSeconds)} hrs`), inline: true },
            { name: "\u200B", value: "\u200B", inline: false },
            { name: "📺 Top 5 Streamers", value: formatTopList(topStreamers, (m) => `<@${m.userId}> - ${formatHrs(m.streamingSeconds)} hrs`), inline: true },
            { name: "🎥 Top 5 Camera Users", value: formatTopList(topCameraUsers, (m) => `<@${m.userId}> - ${formatHrs(m.cameraSeconds)} hrs`), inline: true },
            { name: "\u200B", value: "\u200B", inline: false },
            { name: "🟢 Top 5 Most Online", value: formatTopList(mostOnlineList, (m) => `<@${m.userId}> - ${formatHrs(m.onlineSeconds)} hrs`), inline: true },
            { name: "🌙 Top 5 Most Idle", value: formatTopList(mostIdleList, (m) => `<@${m.userId}> - ${formatHrs(m.idleSeconds)} hrs`), inline: true },
            { name: "\u200B", value: "\u200B", inline: false },
            { name: "🔴 Top 5 Most DND", value: formatTopList(mostDndList, (m) => `<@${m.userId}> - ${formatHrs(m.dndSeconds)} hrs`), inline: true },
            { name: "🎮 Top 5 Gamers", value: formatTopList(topGamers, (m) => `<@${m.userId}> - ${m.topGameName} (${formatHrs(m.topGameSeconds)} hrs)`), inline: true },
            { name: "\u200B", value: "\u200B", inline: false },
            { name: "🎵 Top 5 Spotify Listeners", value: formatTopList(topSpotifyListeners, (m) => `<@${m.userId}> - ${formatHrs(m.spotifySeconds)} hrs`), inline: true },
            { name: "⚡ Top 5 Command Users", value: formatTopList(topCmdUsers, (m) => `<@${m.userId}> - ${m.commandsUsed} cmds`), inline: true },
            { name: "\u200B", value: "\u200B", inline: false },
            { name: "📩 Top 5 Inviters", value: formatTopList(topInviters, (m) => `<@${m.userId}> - ${m.invitesCount} invites`), inline: true }
          )

          .setColor(0x5865f2)
          .setFooter({ text: `Lynx Rewind • ${year}`, iconURL: this.client.user?.displayAvatarURL() })
          .setTimestamp();





        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("launch_personal_rewind")
            .setLabel("✨ View My Personal Rewind")
            .setStyle(ButtonStyle.Primary)
        );

        await targetChannel.send({ embeds: [embed], components: [row] });
        this.logger.log(`Posted Yearly Rewind broadcast to ${guild.name} (#${targetChannel.name})`);
      } catch (err) {
        this.logger.error(`Failed to post Yearly Rewind broadcast for guild ${guildId}: ${err}`);
      }
    }
  }
}
