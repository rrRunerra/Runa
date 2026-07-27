import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../structures/Command";
import { client } from "../../index";
import { rewindBuffer } from "../../services/rewindBufferService";

export default class RewindCommand extends Command {
  constructor() {
    super({
      name: "rewind",
      description: "View your personal or server's Yearly Rewind (Wrapped slides).",
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
      allowDm: false,
      docs: "Interactive Yearly Rewind showing personal and server activity stats.",
      options: [
        {
          name: "user",
          description: "Target user for personal rewind",
          type: 6, // USER
          required: false,
        },
        {
          name: "year",
          description: "Year to view (defaults to current year)",
          type: 4, // INTEGER
          required: false,
        },
        {
          name: "config_channel",
          description: "Admin: Set the rewind announcement channel",
          type: 7, // CHANNEL
          channel_types: [0], // GUILD_TEXT
          required: false,
        },
      ],
    });
  }

  async slashCommandExecute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "The `/rewind` command can only be used inside a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const configChannel = interaction.options.getChannel("config_channel");
    if (configChannel) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "❌ You need Administrator permissions to configure the rewind announcement channel.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await this.client.prisma.lynxRewindConfig.upsert({
        where: { guildId: interaction.guildId },
        create: {
          guildId: interaction.guildId,
          announcementChannelId: configChannel.id,
        },
        update: {
          announcementChannelId: configChannel.id,
        },
      });

      await interaction.reply({
        content: `✅ Rewind announcement channel configured to <#${configChannel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Flush pending memory buffer to DB so stats are 100% up-to-date
    await rewindBuffer.flushToDatabase();

    const year = interaction.options.getInteger("year") || new Date().getFullYear();
    const explicitUser = interaction.options.getUser("user");

    // If NO user argument was provided, show full Server Rewind stats!
    if (!explicitUser) {
      await this.showServerRewind(interaction, year);
      return;
    }

    // If user argument was provided, show personal Wrapped slides for that user
    await this.showPersonalRewind(interaction, explicitUser, year);
  }

  private async showServerRewind(interaction: ChatInputCommandInteraction, year: number) {
    const guild = interaction.guild!;
    const totals = await this.client.prisma.lynxUserYearlyStats.aggregate({
      where: { guildId: interaction.guildId!, year },
      _sum: {
        messagesSent: true,
        messagesEdited: true,
        messagesDeleted: true,
        totalWordCount: true,
        totalCharCount: true,
        totalVoiceSeconds: true,
        commandsUsed: true,
        reactionsAdded: true,
        reactionsReceived: true,
        mentionsSent: true,
        attachmentsSent: true,
        mediaCount: true,
        streamingSeconds: true,
        cameraSeconds: true,
        mutedSeconds: true,
        deafenedSeconds: true,
        onlineSeconds: true,
        idleSeconds: true,
        dndSeconds: true,
        spotifySeconds: true,
        invitesCount: true,
        messagesClearedCount: true,
        moderationActionsCount: true,
      },
    });

    const msgCount = totals._sum.messagesSent || 0;
    const msgEdited = totals._sum.messagesEdited || 0;
    const msgDeleted = totals._sum.messagesDeleted || 0;
    const totalWords = totals._sum.totalWordCount || BigInt(0);

    const vcHours = Math.round((totals._sum.totalVoiceSeconds || 0) / 3600);
    const streamHours = Math.round((totals._sum.streamingSeconds || 0) / 3600);
    const cameraHours = Math.round((totals._sum.cameraSeconds || 0) / 3600);
    const spotifyHours = Math.round((totals._sum.spotifySeconds || 0) / 3600);

    const cmdCount = totals._sum.commandsUsed || 0;
    const reactionCount = totals._sum.reactionsAdded || 0;
    const mediaTotal = (totals._sum.attachmentsSent || 0) + (totals._sum.mediaCount || 0);

    const topChatters = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year },
      orderBy: { messagesSent: "desc" },
      take: 5,
    });

    const topVcMembers = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, totalVoiceSeconds: { gt: 0 } },
      orderBy: { totalVoiceSeconds: "desc" },
      take: 5,
    });

    const mostOnlineList = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, onlineSeconds: { gt: 0 } },
      orderBy: { onlineSeconds: "desc" },
      take: 5,
    });

    const mostIdleList = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, idleSeconds: { gt: 0 } },
      orderBy: { idleSeconds: "desc" },
      take: 5,
    });

    const mostDndList = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, dndSeconds: { gt: 0 } },
      orderBy: { dndSeconds: "desc" },
      take: 5,
    });

    const topStreamers = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, streamingSeconds: { gt: 0 } },
      orderBy: { streamingSeconds: "desc" },
      take: 5,
    });

    const topCameraUsers = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, cameraSeconds: { gt: 0 } },
      orderBy: { cameraSeconds: "desc" },
      take: 5,
    });

    const longestSessions = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, longestVcSessionSeconds: { gt: 0 } },
      orderBy: { longestVcSessionSeconds: "desc" },
      take: 5,
    });

    const topGamers = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, topGameSeconds: { gt: 0 } },
      orderBy: { topGameSeconds: "desc" },
      take: 5,
    });

    const topSpotifyListeners = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, spotifySeconds: { gt: 0 } },
      orderBy: { spotifySeconds: "desc" },
      take: 5,
    });

    const topInviters = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, invitesCount: { gt: 0 } },
      orderBy: { invitesCount: "desc" },
      take: 5,
    });

    const topCmdUsers = await this.client.prisma.lynxUserYearlyStats.findMany({
      where: { guildId: interaction.guildId!, year, commandsUsed: { gt: 0 } },
      orderBy: { commandsUsed: "desc" },
      take: 5,
    });

    const formatHrs = (sec: number) => (sec / 3600).toFixed(1);

    const formatTopList = (list: any[], formatFn: (item: any) => string) => {
      return list.length > 0
        ? list.map((item, i) => `${i === 0 ? "👑" : `${i + 1}.`} ${formatFn(item)}`).join("\n")
        : "None";
    };

    const embed = new EmbedBuilder()
      .setTitle(`🎉 ${guild.name}'s ${year} Server Rewind 🎉`)
      .setThumbnail(guild.iconURL() || this.client.user?.displayAvatarURL() || "")
      .setColor(0x5865f2)
      .setDescription(`Here is a comprehensive look back at server activity for **${guild.name}** in **${year}**!`)
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
        { name: "👑 Top 5 Chatters", value: formatTopList(topChatters, (m) => `<@${m.userId}> - ${m.messagesSent.toLocaleString()} msgs`), inline: true },
        { name: "🎙️ Top 5 Voice Legends", value: formatTopList(topVcMembers, (m) => `<@${m.userId}> - ${formatHrs(m.totalVoiceSeconds)} hrs`), inline: true },
        { name: "\u200B", value: "\u200B", inline: false },
        { name: "📺 Top 5 Streamers", value: formatTopList(topStreamers, (m) => `<@${m.userId}> - ${formatHrs(m.streamingSeconds)} hrs`), inline: true },
        { name: "🎥 Top 5 Camera Users", value: formatTopList(topCameraUsers, (m) => `<@${m.userId}> - ${formatHrs(m.cameraSeconds)} hrs`), inline: true },
        { name: "\u200B", value: "\u200B", inline: false },
        { name: "⏱️ Top 5 Longest VC", value: formatTopList(longestSessions, (m) => `<@${m.userId}> - ${formatHrs(m.longestVcSessionSeconds)} hrs`), inline: true },
        { name: "🎮 Top 5 Gamers", value: formatTopList(topGamers, (m) => `<@${m.userId}> - ${m.topGameName} (${formatHrs(m.topGameSeconds)} hrs)`), inline: true },
        { name: "\u200B", value: "\u200B", inline: false },
        { name: "🟢 Top 5 Most Online", value: formatTopList(mostOnlineList, (m) => `<@${m.userId}> - ${formatHrs(m.onlineSeconds)} hrs`), inline: true },
        { name: "🌙 Top 5 Most Idle", value: formatTopList(mostIdleList, (m) => `<@${m.userId}> - ${formatHrs(m.idleSeconds)} hrs`), inline: true },
        { name: "\u200B", value: "\u200B", inline: false },
        { name: "🔴 Top 5 Most DND", value: formatTopList(mostDndList, (m) => `<@${m.userId}> - ${formatHrs(m.dndSeconds)} hrs`), inline: true },
        { name: "🎵 Top 5 Spotify Listeners", value: formatTopList(topSpotifyListeners, (m) => `<@${m.userId}> - ${formatHrs(m.spotifySeconds)} hrs`), inline: true },
        { name: "\u200B", value: "\u200B", inline: false },
        { name: "⚡ Top 5 Command Users", value: formatTopList(topCmdUsers, (m) => `<@${m.userId}> - ${m.commandsUsed} cmds`), inline: true },
        { name: "📩 Top 5 Inviters", value: formatTopList(topInviters, (m) => `<@${m.userId}> - ${m.invitesCount} invites`), inline: true }
      )

      .setFooter({ text: `Lynx Rewind • ${year} • Use /rewind user:@member for personal stats`, iconURL: this.client.user?.displayAvatarURL() })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("view_personal_rewind_btn")
        .setLabel("✨ View My Personal Rewind")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "view_personal_rewind_btn") {
        const userStats = await this.client.prisma.lynxUserYearlyStats.findUnique({
          where: {
            guildId_userId_year: {
              guildId: interaction.guildId!,
              userId: i.user.id,
              year,
            },
          },
        });

        if (!userStats) {
          await i.reply({
            content: `No activity stats recorded for you in **${year}** yet. Start chatting!`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const userSlides = await this.buildPersonalSlides(interaction, i.user, year, userStats);
        let slideIndex = 0;

        const getUserRow = (idx: number) => new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("user_prev").setLabel("⬅️ Previous").setStyle(ButtonStyle.Secondary).setDisabled(idx === 0),
          new ButtonBuilder().setCustomId("user_page").setLabel(`Page ${idx + 1}/${userSlides.length}`).setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("user_next").setLabel("Next ➡️").setStyle(ButtonStyle.Secondary).setDisabled(idx === userSlides.length - 1)
        );

        await i.reply({
          embeds: [userSlides[slideIndex]],
          components: [getUserRow(slideIndex)],
          flags: MessageFlags.Ephemeral,
        });
        const subReply = await i.fetchReply();

        const subCollector = subReply.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 120000,
        });

        subCollector.on("collect", async (subI) => {
          if (subI.customId === "user_prev" && slideIndex > 0) slideIndex--;
          else if (subI.customId === "user_next" && slideIndex < userSlides.length - 1) slideIndex++;

          await subI.update({
            embeds: [userSlides[slideIndex]],
            components: [getUserRow(slideIndex)],
          });
        });
      }
    });
  }

  private async showPersonalRewind(
    interaction: ChatInputCommandInteraction,
    targetUser: any,
    year: number
  ) {
    const stats = await this.client.prisma.lynxUserYearlyStats.findUnique({
      where: {
        guildId_userId_year: {
          guildId: interaction.guildId!,
          userId: targetUser.id,
          year,
        },
      },
    });

    if (!stats) {
      await interaction.reply({
        content: `No activity stats recorded for ${targetUser.username} in **${year}** yet. Start chatting and hanging out in VC!`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const slides = await this.buildPersonalSlides(interaction, targetUser, year, stats);
    let currentSlide = 0;

    const getRow = (index: number) => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("rewind_prev")
          .setLabel("⬅️ Previous")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === 0),
        new ButtonBuilder()
          .setCustomId("rewind_page")
          .setLabel(`Page ${index + 1}/${slides.length}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("rewind_next")
          .setLabel("Next ➡️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === slides.length - 1)
      );
    };

    await interaction.reply({
      embeds: [slides[currentSlide]],
      components: [getRow(currentSlide)],
    });
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
    });


    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: "Run `/rewind` yourself to see your own Wrapped slides!",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (i.customId === "rewind_prev" && currentSlide > 0) {
        currentSlide--;
      } else if (i.customId === "rewind_next" && currentSlide < slides.length - 1) {
        currentSlide++;
      }

      await i.update({
        embeds: [slides[currentSlide]],
        components: [getRow(currentSlide)],
      });
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("rewind_prev").setLabel("⬅️ Previous").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("rewind_page").setLabel(`Page ${currentSlide + 1}/${slides.length}`).setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId("rewind_next").setLabel("Next ➡️").setStyle(ButtonStyle.Secondary).setDisabled(true)
      );
      await interaction.editReply({ components: [disabledRow] }).catch(() => null);
    });
  }


  private async buildPersonalSlides(
    interaction: ChatInputCommandInteraction,
    targetUser: any,
    year: number,
    stats: any
  ): Promise<EmbedBuilder[]> {
    const guildName = interaction.guild?.name || "Server";
    const userAvatar = targetUser.displayAvatarURL();

    // Calculate Badge
    let badge = "🌟 Server Explorer";
    if (stats.totalVoiceSeconds > 180000) badge = "🎙️ VC Mastermind";
    else if (stats.messagesSent > 1000) badge = "💬 Chat Legend";
    else if (stats.commandsUsed > 200) badge = "⚡ Command Wizard";
    else if (stats.reactionsAdded > 300) badge = "🔥 Emoji Enthusiast";

    // Format helpers
    const formatHours = (seconds: number) => {
      const hrs = (seconds / 3600).toFixed(1);
      return `${hrs} hrs (${Math.floor(seconds / 60)} mins)`;
    };

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const peakDayStr = stats.peakDayOfWeek !== null && stats.peakDayOfWeek !== undefined ? days[stats.peakDayOfWeek] : "N/A";
    const peakHourStr = stats.peakHourOfDay !== null && stats.peakHourOfDay !== undefined ? `${stats.peakHourOfDay}:00 - ${stats.peakHourOfDay + 1}:00` : "N/A";

    // Top VC Companion
    let companionMention = "None";
    if (stats.topVcCompanionUserId) {
      companionMention = `<@${stats.topVcCompanionUserId}>`;
    }

    // Top Channel
    let topChannelMention = "None";
    if (stats.mostActiveChannelId) {
      topChannelMention = `<#${stats.mostActiveChannelId}>`;
    }

    // Top Voice Channel
    let topVcChannelMention = "None";
    if (stats.topVoiceChannelId) {
      topVcChannelMention = `<#${stats.topVoiceChannelId}>`;
    }

    // Top Emojis
    let topEmojisStr = "None";
    if (stats.topEmojis && typeof stats.topEmojis === "object") {
      const sorted = Object.entries(stats.topEmojis as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (sorted.length > 0) {
        topEmojisStr = sorted.map(([e, cnt]) => `${e} (${cnt})`).join(", ");
      }
    }

    // Top Commands
    const topCmdsList = await this.client.prisma.lynxCommandUsage.findMany({
      where: {
        guildId: interaction.guildId!,
        userId: targetUser.id,
        year,
      },
      orderBy: { count: "desc" },
      take: 5,
    });
    const topCmdsStr = topCmdsList.length > 0
      ? topCmdsList.map((c) => `\`/${c.commandName}\` (${c.count})`).join(", ")
      : "None";

    // Slide 1: Overview
    const slide1 = new EmbedBuilder()
      .setTitle(`✨ ${targetUser.username}'s ${year} Rewind in ${guildName}`)
      .setThumbnail(userAvatar)
      .setColor(0x5865f2)
      .setDescription(`### Your ${year} Title: **${badge}**`)
      .addFields(
        { name: "💬 Messages Sent", value: stats.messagesSent.toLocaleString(), inline: true },
        { name: "🎙️ Time in VC", value: formatHours(stats.totalVoiceSeconds), inline: true },
        { name: "📷 Files Uploaded", value: (stats.attachmentsSent + stats.mediaCount).toLocaleString(), inline: true },
        { name: "⚡ Commands Run", value: stats.commandsUsed.toLocaleString(), inline: true },
        { name: "🔥 Reactions Given", value: stats.reactionsAdded.toLocaleString(), inline: true }
      )
      .setFooter({ text: "Page 1 of 5 • Rewind Overview", iconURL: this.client.user?.displayAvatarURL() });

    // Slide 2: Voice & Companions
    const slide2 = new EmbedBuilder()
      .setTitle(`🎙️ Voice Channel & Video Stats - ${year}`)
      .setThumbnail(userAvatar)
      .setColor(0x57f287)
      .addFields(
        { name: "🔊 Total Voice Time", value: formatHours(stats.totalVoiceSeconds), inline: true },
        { name: "⏱️ Longest VC Session", value: formatHours(stats.longestVcSessionSeconds), inline: true },
        { name: "📺 Screen Share Time", value: formatHours(stats.streamingSeconds), inline: true },
        { name: "🎥 Camera Video Time", value: formatHours(stats.cameraSeconds), inline: true },
        { name: "📍 Favorite Voice Channel", value: topVcChannelMention, inline: true },
        { name: "👥 Top VC Companion", value: companionMention, inline: true }
      )
      .setFooter({ text: "Page 2 of 5 • Voice & Video", iconURL: this.client.user?.displayAvatarURL() });

    // Slide 3: Chat Habits & Status Trends
    const slide3 = new EmbedBuilder()
      .setTitle(`💬 Chat & Status Trends - ${year}`)
      .setThumbnail(userAvatar)
      .setColor(0xfee75c)
      .addFields(
        {
          name: "💬 Message Activity",
          value:
            `✉️ **Sent:** ${stats.messagesSent.toLocaleString()}\n` +
            `✏️ **Edited:** ${stats.messagesEdited.toLocaleString()}\n` +
            `🗑️ **Deleted:** ${stats.messagesDeleted.toLocaleString()}\n` +
            `📝 **Words Written:** ${BigInt(stats.totalWordCount).toLocaleString()}`,
          inline: false,
        },
        { name: "📌 Top Channel", value: topChannelMention, inline: true },
        { name: "📅 Peak Day", value: peakDayStr, inline: true },
        { name: "⏰ Peak Hour", value: peakHourStr, inline: true },
        { name: "🟢 Online Time", value: formatHours(stats.onlineSeconds), inline: true },
        { name: "🌙 Idle Time", value: formatHours(stats.idleSeconds), inline: true },
        { name: "🔴 DND Time", value: formatHours(stats.dndSeconds), inline: true }
      )
      .setFooter({ text: "Page 3 of 5 • Chat & Status Trends", iconURL: this.client.user?.displayAvatarURL() });

    // Slide 4: Commands & Interactions
    const slide4 = new EmbedBuilder()
      .setTitle(`⚡ Commands & Emoji Stats - ${year}`)
      .setThumbnail(userAvatar)
      .setColor(0xeb459e)
      .addFields(
        { name: "⚡ Commands Run", value: stats.commandsUsed.toLocaleString(), inline: true },
        { name: "🏆 Top 5 Commands", value: topCmdsStr, inline: false },
        { name: "💖 Reactions Given", value: stats.reactionsAdded.toLocaleString(), inline: true },
        { name: "🌟 Reactions Received", value: stats.reactionsReceived.toLocaleString(), inline: true },
        { name: "📣 Mentions Sent", value: stats.mentionsSent.toLocaleString(), inline: true },
        { name: "📥 Mentions Received", value: stats.mentionsReceived.toLocaleString(), inline: true },
        { name: "😍 Top 5 Emojis", value: topEmojisStr, inline: false }
      )
      .setFooter({ text: "Page 4 of 5 • Commands & Emojis", iconURL: this.client.user?.displayAvatarURL() });

    // Slide 5: Gaming, Spotify & Status Quotes
    const topGameStr = stats.topGameName ? `**${stats.topGameName}** (${formatHours(stats.topGameSeconds)})` : "None";
    const topTrackStr = stats.topSpotifyTrack ? `**${stats.topSpotifyTrack}**` : "None";
    const topArtistStr = stats.topSpotifyArtist ? `**${stats.topSpotifyArtist}**` : "None";

    let customQuoteStr = "None";
    if (stats.customStatusQuotes && typeof stats.customStatusQuotes === "object") {
      const sortedQuotes = Object.entries(stats.customStatusQuotes as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      if (sortedQuotes.length > 0) {
        customQuoteStr = sortedQuotes.map(([q, cnt]) => `"${q}" (${cnt})`).join(", ");
      }
    }

    const slide5 = new EmbedBuilder()
      .setTitle(`🎮 Gaming, Spotify & Status Quotes - ${year}`)
      .setThumbnail(userAvatar)
      .setColor(0x9b59b6)
      .addFields(
        { name: "🎮 Top Game Played", value: topGameStr, inline: false },
        { name: "🎵 Spotify Time", value: formatHours(stats.spotifySeconds), inline: true },
        { name: "🎧 Top Track", value: topTrackStr, inline: true },
        { name: "🎙️ Top Artist", value: topArtistStr, inline: true },
        { name: "💭 Top 5 Status Quotes", value: customQuoteStr, inline: false },
        { name: "🚀 Server Booster Status", value: stats.isBooster ? "✨ Active Server Booster" : "Not boosting", inline: true }
      )
      .setFooter({ text: "Page 5 of 5 • Gaming & Spotify", iconURL: this.client.user?.displayAvatarURL() });


    return [slide1, slide2, slide3, slide4, slide5];
  }
}


