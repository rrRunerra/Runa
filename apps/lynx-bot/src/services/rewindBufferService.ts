import { prisma } from "@runa/database";

export interface UserStatDelta {
  messagesSent: number;
  messagesEdited: number;
  messagesDeleted: number;
  totalWordCount: bigint;
  totalCharCount: bigint;
  commandsUsed: number;
  totalVoiceSeconds: number;
  longestVcSessionSeconds: number;
  voiceChannelSeconds: Record<string, number>;
  companionSeconds: Record<string, number>;
  activeChannelCounts: Record<string, number>;
  hourlyCounts: Record<number, number>;
  dailyCounts: Record<number, number>;
  reactionsAdded: number;
  reactionsReceived: number;
  mentionsSent: number;
  mentionsReceived: number;
  attachmentsSent: number;
  mediaCount: number;
  streamingSeconds: number;
  cameraSeconds: number;
  mutedSeconds: number;
  deafenedSeconds: number;
  onlineSeconds: number;
  idleSeconds: number;
  dndSeconds: number;
  invitesCount: number;
  messagesClearedCount: number;
  moderationActionsCount: number;
  gameSeconds: Record<string, number>;
  spotifySeconds: number;
  spotifyTracks: Record<string, number>;
  spotifyArtists: Record<string, number>;
  customStatuses: Record<string, number>;
  boostingSeconds: number;
  isBooster: boolean;
  emojiCounts: Record<string, number>;
  commandCounts: Record<string, number>;
}

class RewindBufferService {
  private buffer = new Map<string, UserStatDelta>();
  private activeVoiceSessions = new Map<string, { joinedAt: Date; channelId: string; guildId: string; userId: string; isStreaming: boolean; isCamera: boolean; isMuted: boolean; isDeafened: boolean }>();
  private activePresenceSessions = new Map<string, { status: string; changedAt: Date }>();
  private activeGameSessions = new Map<string, { gameName: string; startedAt: Date }>();
  private activeSpotifySessions = new Map<string, { track: string; artist: string; startedAt: Date }>();

  public isTrackingDisabled(): boolean {
    const val = process.env.LYNX_DISABLE_TRACKING;
    return val === "true" || val === "1";
  }

  private getOrCreateDelta(guildId: string, userId: string, year: number = new Date().getFullYear()): UserStatDelta {
    const key = `${guildId}:${userId}:${year}`;
    let delta = this.buffer.get(key);
    if (!delta) {
      delta = {
        messagesSent: 0,
        messagesEdited: 0,
        messagesDeleted: 0,
        totalWordCount: BigInt(0),
        totalCharCount: BigInt(0),
        commandsUsed: 0,
        totalVoiceSeconds: 0,
        longestVcSessionSeconds: 0,
        voiceChannelSeconds: {},
        companionSeconds: {},
        activeChannelCounts: {},
        hourlyCounts: {},
        dailyCounts: {},
        reactionsAdded: 0,
        reactionsReceived: 0,
        mentionsSent: 0,
        mentionsReceived: 0,
        attachmentsSent: 0,
        mediaCount: 0,
        streamingSeconds: 0,
        cameraSeconds: 0,
        mutedSeconds: 0,
        deafenedSeconds: 0,
        onlineSeconds: 0,
        idleSeconds: 0,
        dndSeconds: 0,
        invitesCount: 0,
        messagesClearedCount: 0,
        moderationActionsCount: 0,
        gameSeconds: {},
        spotifySeconds: 0,
        spotifyTracks: {},
        spotifyArtists: {},
        customStatuses: {},
        boostingSeconds: 0,
        isBooster: false,
        emojiCounts: {},
        commandCounts: {},
      };
      this.buffer.set(key, delta);
    }
    return delta;
  }



  public recordMessageSent(params: {
    guildId: string;
    userId: string;
    channelId: string;
    content: string;
    mentionsCount: number;
    attachmentsCount?: number;
    mediaCount?: number;
  }) {
    if (this.isTrackingDisabled()) return;
    const now = new Date();
    const year = now.getFullYear();
    const hour = now.getHours();
    const day = now.getDay();

    const delta = this.getOrCreateDelta(params.guildId, params.userId, year);
    delta.messagesSent += 1;
    delta.totalCharCount += BigInt(params.content.length);

    if (params.attachmentsCount) delta.attachmentsSent += params.attachmentsCount;
    if (params.mediaCount) delta.mediaCount += params.mediaCount;

    const words = params.content.trim().split(/\s+/).filter(Boolean).length;
    delta.totalWordCount += BigInt(words);

    delta.activeChannelCounts[params.channelId] = (delta.activeChannelCounts[params.channelId] || 0) + 1;
    delta.hourlyCounts[hour] = (delta.hourlyCounts[hour] || 0) + 1;
    delta.dailyCounts[day] = (delta.dailyCounts[day] || 0) + 1;
    delta.mentionsSent += params.mentionsCount;

    // Extract emojis (both Discord custom emojis and unicode emojis)
    const discordEmojiRegex = /<a?:(\w+):(\d+)>/g;
    let match: RegExpExecArray | null;
    while ((match = discordEmojiRegex.exec(params.content)) !== null) {
      const emojiStr = `<:${match[1]}:${match[2]}>`;
      delta.emojiCounts[emojiStr] = (delta.emojiCounts[emojiStr] || 0) + 1;
    }

    const unicodeEmojiRegex = /\p{Extended_Pictographic}/gu;
    const unicodeMatches = params.content.match(unicodeEmojiRegex);
    if (unicodeMatches) {
      for (const emoji of unicodeMatches) {
        delta.emojiCounts[emoji] = (delta.emojiCounts[emoji] || 0) + 1;
      }
    }
  }

  public recordMessageEdited(guildId: string, userId: string) {
    if (this.isTrackingDisabled()) return;
    const delta = this.getOrCreateDelta(guildId, userId);
    delta.messagesEdited += 1;
  }

  public recordMessageDeleted(guildId: string, userId: string) {
    if (this.isTrackingDisabled()) return;
    const delta = this.getOrCreateDelta(guildId, userId);
    delta.messagesDeleted += 1;
  }

  public recordReaction(guildId: string, reactorUserId: string, authorUserId?: string) {
    if (this.isTrackingDisabled()) return;
    const year = new Date().getFullYear();
    const reactorDelta = this.getOrCreateDelta(guildId, reactorUserId, year);
    reactorDelta.reactionsAdded += 1;

    if (authorUserId && authorUserId !== reactorUserId) {
      const authorDelta = this.getOrCreateDelta(guildId, authorUserId, year);
      authorDelta.reactionsReceived += 1;
    }
  }

  public recordMentionReceived(guildId: string, mentionedUserId: string, count: number = 1) {
    if (this.isTrackingDisabled()) return;
    const delta = this.getOrCreateDelta(guildId, mentionedUserId);
    delta.mentionsReceived += count;
  }

  public recordCommandUsage(guildId: string, userId: string, commandName: string) {
    if (this.isTrackingDisabled()) return;
    const delta = this.getOrCreateDelta(guildId, userId);
    delta.commandsUsed += 1;
    delta.commandCounts[commandName] = (delta.commandCounts[commandName] || 0) + 1;
  }

  public handleVoiceJoin(guildId: string, userId: string, channelId: string, state?: { isStreaming?: boolean; isCamera?: boolean; isMuted?: boolean; isDeafened?: boolean }) {
    if (this.isTrackingDisabled()) return;
    const key = `${guildId}:${userId}`;
    this.activeVoiceSessions.set(key, {
      joinedAt: new Date(),
      channelId,
      guildId,
      userId,
      isStreaming: !!state?.isStreaming,
      isCamera: !!state?.isCamera,
      isMuted: !!state?.isMuted,
      isDeafened: !!state?.isDeafened,
    });
  }

  public handleVoiceLeave(guildId: string, userId: string, otherMembersInVc: string[] = []) {
    if (this.isTrackingDisabled()) return;
    const key = `${guildId}:${userId}`;
    const session = this.activeVoiceSessions.get(key);
    if (!session) return;

    this.activeVoiceSessions.delete(key);

    const now = new Date();
    const durationSeconds = Math.max(0, Math.floor((now.getTime() - session.joinedAt.getTime()) / 1000));
    if (durationSeconds <= 0) return;

    const year = session.joinedAt.getFullYear();
    const delta = this.getOrCreateDelta(guildId, userId, year);

    delta.totalVoiceSeconds += durationSeconds;
    if (durationSeconds > delta.longestVcSessionSeconds) {
      delta.longestVcSessionSeconds = durationSeconds;
    }

    if (session.isStreaming) delta.streamingSeconds += durationSeconds;
    if (session.isCamera) delta.cameraSeconds += durationSeconds;
    if (session.isMuted) delta.mutedSeconds += durationSeconds;
    if (session.isDeafened) delta.deafenedSeconds += durationSeconds;

    delta.voiceChannelSeconds[session.channelId] = (delta.voiceChannelSeconds[session.channelId] || 0) + durationSeconds;

    for (const companionId of otherMembersInVc) {
      if (companionId !== userId) {
        delta.companionSeconds[companionId] = (delta.companionSeconds[companionId] || 0) + durationSeconds;
      }
    }
  }

  public handlePresenceChange(guildId: string, userId: string, newStatus: string) {
    if (this.isTrackingDisabled()) return;
    const key = `${guildId}:${userId}`;
    const prev = this.activePresenceSessions.get(key);
    const now = new Date();

    if (prev) {
      const durSec = Math.max(0, Math.floor((now.getTime() - prev.changedAt.getTime()) / 1000));
      if (durSec > 0) {
        const delta = this.getOrCreateDelta(guildId, userId, prev.changedAt.getFullYear());
        if (prev.status === "online") delta.onlineSeconds += durSec;
        else if (prev.status === "idle") delta.idleSeconds += durSec;
        else if (prev.status === "dnd") delta.dndSeconds += durSec;
      }
    }

    this.activePresenceSessions.set(key, {
      status: newStatus,
      changedAt: now,
    });
  }

  public recordInvite(guildId: string, inviterUserId: string) {
    if (this.isTrackingDisabled()) return;
    const delta = this.getOrCreateDelta(guildId, inviterUserId);
    delta.invitesCount += 1;
  }

  public recordModerationAction(guildId: string, moderatorUserId: string, isClear: boolean = false) {
    if (this.isTrackingDisabled()) return;
    const delta = this.getOrCreateDelta(guildId, moderatorUserId);
    if (isClear) delta.messagesClearedCount += 1;
    else delta.moderationActionsCount += 1;
  }

  public recordCustomStatus(guildId: string, userId: string, statusText: string) {
    if (this.isTrackingDisabled() || !statusText.trim()) return;
    const delta = this.getOrCreateDelta(guildId, userId);
    delta.customStatuses[statusText] = (delta.customStatuses[statusText] || 0) + 1;
  }

  public recordGameActivity(guildId: string, userId: string, gameName: string, durationSec: number) {
    if (this.isTrackingDisabled() || durationSec <= 0) return;
    const delta = this.getOrCreateDelta(guildId, userId);
    delta.gameSeconds[gameName] = (delta.gameSeconds[gameName] || 0) + durationSec;
  }

  public recordSpotifyActivity(guildId: string, userId: string, track: string, artist: string, durationSec: number) {
    if (this.isTrackingDisabled() || durationSec <= 0) return;
    const delta = this.getOrCreateDelta(guildId, userId);
    delta.spotifySeconds += durationSec;
    if (track) delta.spotifyTracks[track] = (delta.spotifyTracks[track] || 0) + 1;
    if (artist) delta.spotifyArtists[artist] = (delta.spotifyArtists[artist] || 0) + 1;
  }

  public recordBoost(guildId: string, userId: string, boostSec: number) {
    if (this.isTrackingDisabled()) return;
    const delta = this.getOrCreateDelta(guildId, userId);
    delta.isBooster = true;
    delta.boostingSeconds += boostSec;
  }

  public async flushToDatabase(): Promise<void> {
    if (this.buffer.size === 0) return;

    const snapshot = new Map(this.buffer);
    this.buffer.clear();

    for (const [key, delta] of snapshot.entries()) {
      const [guildId, userId, yearStr] = key.split(":");
      const year = parseInt(yearStr, 10);

      try {
        const existing = await prisma.lynxUserYearlyStats.findUnique({
          where: {
            guildId_userId_year: { guildId, userId, year },
          },
        });

        // Merge maps
        const mergedHourly: Record<string, number> = existing?.hourlyActivity && typeof existing.hourlyActivity === "object"
          ? (existing.hourlyActivity as Record<string, number>)
          : {};
        for (const [h, count] of Object.entries(delta.hourlyCounts)) {
          mergedHourly[h] = (mergedHourly[h] || 0) + count;
        }

        const mergedDaily: Record<string, number> = existing?.dailyActivity && typeof existing.dailyActivity === "object"
          ? (existing.dailyActivity as Record<string, number>)
          : {};
        for (const [d, count] of Object.entries(delta.dailyCounts)) {
          mergedDaily[d] = (mergedDaily[d] || 0) + count;
        }

        const mergedEmojis: Record<string, number> = existing?.topEmojis && typeof existing.topEmojis === "object"
          ? (existing.topEmojis as Record<string, number>)
          : {};
        for (const [emoji, count] of Object.entries(delta.emojiCounts)) {
          mergedEmojis[emoji] = (mergedEmojis[emoji] || 0) + count;
        }

        const mergedGames: Record<string, number> = existing?.gameActivity && typeof existing.gameActivity === "object"
          ? (existing.gameActivity as Record<string, number>)
          : {};
        for (const [g, sec] of Object.entries(delta.gameSeconds)) {
          mergedGames[g] = (mergedGames[g] || 0) + sec;
        }

        const mergedSpotifyTracks: Record<string, number> = existing?.spotifyTracks && typeof existing.spotifyTracks === "object"
          ? (existing.spotifyTracks as Record<string, number>)
          : {};
        for (const [t, cnt] of Object.entries(delta.spotifyTracks)) {
          mergedSpotifyTracks[t] = (mergedSpotifyTracks[t] || 0) + cnt;
        }

        const mergedSpotifyArtists: Record<string, number> = existing?.spotifyArtists && typeof existing.spotifyArtists === "object"
          ? (existing.spotifyArtists as Record<string, number>)
          : {};
        for (const [a, cnt] of Object.entries(delta.spotifyArtists)) {
          mergedSpotifyArtists[a] = (mergedSpotifyArtists[a] || 0) + cnt;
        }

        const mergedStatuses: Record<string, number> = existing?.customStatusQuotes && typeof existing.customStatusQuotes === "object"
          ? (existing.customStatusQuotes as Record<string, number>)
          : {};
        for (const [st, cnt] of Object.entries(delta.customStatuses)) {
          mergedStatuses[st] = (mergedStatuses[st] || 0) + cnt;
        }

        // Calculate top game
        let topGame: string | null = existing?.topGameName ?? null;
        let maxGameSec = existing?.topGameSeconds ?? 0;
        for (const [g, sec] of Object.entries(mergedGames)) {
          if (sec > maxGameSec) {
            maxGameSec = sec;
            topGame = g;
          }
        }

        // Calculate top spotify track & artist
        let topTrack: string | null = existing?.topSpotifyTrack ?? null;
        let maxTrackCnt = 0;
        for (const [t, cnt] of Object.entries(mergedSpotifyTracks)) {
          if (cnt > maxTrackCnt) {
            maxTrackCnt = cnt;
            topTrack = t;
          }
        }

        let topArtist: string | null = existing?.topSpotifyArtist ?? null;
        let maxArtistCnt = 0;
        for (const [a, cnt] of Object.entries(mergedSpotifyArtists)) {
          if (cnt > maxArtistCnt) {
            maxArtistCnt = cnt;
            topArtist = a;
          }
        }

        // Calculate peak hour and day
        let peakHour: number | null = existing?.peakHourOfDay ?? null;
        let maxHourCount = 0;
        for (const [h, c] of Object.entries(mergedHourly)) {
          if (c > maxHourCount) {
            maxHourCount = c;
            peakHour = parseInt(h, 10);
          }
        }

        let peakDay: number | null = existing?.peakDayOfWeek ?? null;
        let maxDayCount = 0;
        for (const [d, c] of Object.entries(mergedDaily)) {
          if (c > maxDayCount) {
            maxDayCount = c;
            peakDay = parseInt(d, 10);
          }
        }

        // Calculate top channel
        let topChannelId: string | null = existing?.mostActiveChannelId ?? null;
        if (Object.keys(delta.activeChannelCounts).length > 0) {
          let maxCount = 0;
          for (const [chId, cnt] of Object.entries(delta.activeChannelCounts)) {
            if (cnt > maxCount) {
              maxCount = cnt;
              topChannelId = chId;
            }
          }
        }

        // Calculate top voice channel & top companion
        let topVoiceChId: string | null = existing?.topVoiceChannelId ?? null;
        if (Object.keys(delta.voiceChannelSeconds).length > 0) {
          let maxSec = 0;
          for (const [vChId, sec] of Object.entries(delta.voiceChannelSeconds)) {
            if (sec > maxSec) {
              maxSec = sec;
              topVoiceChId = vChId;
            }
          }
        }

        let topCompanionId: string | null = existing?.topVcCompanionUserId ?? null;
        if (Object.keys(delta.companionSeconds).length > 0) {
          let maxSec = 0;
          for (const [compUser, sec] of Object.entries(delta.companionSeconds)) {
            if (sec > maxSec) {
              maxSec = sec;
              topCompanionId = compUser;
            }
          }
        }

        const longestVc = Math.max(existing?.longestVcSessionSeconds ?? 0, delta.longestVcSessionSeconds);

        await prisma.lynxUserYearlyStats.upsert({
          where: {
            guildId_userId_year: { guildId, userId, year },
          },
          create: {
            guildId,
            userId,
            year,
            messagesSent: delta.messagesSent,
            messagesEdited: delta.messagesEdited,
            messagesDeleted: delta.messagesDeleted,
            totalWordCount: delta.totalWordCount,
            totalCharCount: delta.totalCharCount,
            commandsUsed: delta.commandsUsed,
            totalVoiceSeconds: delta.totalVoiceSeconds,
            longestVcSessionSeconds: longestVc,
            topVoiceChannelId: topVoiceChId,
            topVcCompanionUserId: topCompanionId,
            mostActiveChannelId: topChannelId,
            peakHourOfDay: peakHour,
            peakDayOfWeek: peakDay,
            reactionsAdded: delta.reactionsAdded,
            reactionsReceived: delta.reactionsReceived,
            mentionsSent: delta.mentionsSent,
            mentionsReceived: delta.mentionsReceived,
            attachmentsSent: delta.attachmentsSent,
            mediaCount: delta.mediaCount,
            streamingSeconds: delta.streamingSeconds,
            cameraSeconds: delta.cameraSeconds,
            mutedSeconds: delta.mutedSeconds,
            deafenedSeconds: delta.deafenedSeconds,
            onlineSeconds: delta.onlineSeconds,
            idleSeconds: delta.idleSeconds,
            dndSeconds: delta.dndSeconds,
            invitesCount: delta.invitesCount,
            messagesClearedCount: delta.messagesClearedCount,
            moderationActionsCount: delta.moderationActionsCount,
            topGameName: topGame,
            topGameSeconds: maxGameSec,
            gameActivity: mergedGames,
            spotifySeconds: delta.spotifySeconds,
            topSpotifyTrack: topTrack,
            topSpotifyArtist: topArtist,
            spotifyTracks: mergedSpotifyTracks,
            spotifyArtists: mergedSpotifyArtists,
            customStatusQuotes: mergedStatuses,
            boostingSeconds: delta.boostingSeconds,
            isBooster: delta.isBooster,
            topEmojis: mergedEmojis,
            hourlyActivity: mergedHourly,
            dailyActivity: mergedDaily,
          },
          update: {
            messagesSent: { increment: delta.messagesSent },
            messagesEdited: { increment: delta.messagesEdited },
            messagesDeleted: { increment: delta.messagesDeleted },
            totalWordCount: { increment: delta.totalWordCount },
            totalCharCount: { increment: delta.totalCharCount },
            commandsUsed: { increment: delta.commandsUsed },
            totalVoiceSeconds: { increment: delta.totalVoiceSeconds },
            longestVcSessionSeconds: longestVc,
            topVoiceChannelId: topVoiceChId ?? undefined,
            topVcCompanionUserId: topCompanionId ?? undefined,
            mostActiveChannelId: topChannelId ?? undefined,
            peakHourOfDay: peakHour ?? undefined,
            peakDayOfWeek: peakDay ?? undefined,
            reactionsAdded: { increment: delta.reactionsAdded },
            reactionsReceived: { increment: delta.reactionsReceived },
            mentionsSent: { increment: delta.mentionsSent },
            mentionsReceived: { increment: delta.mentionsReceived },
            attachmentsSent: { increment: delta.attachmentsSent },
            mediaCount: { increment: delta.mediaCount },
            streamingSeconds: { increment: delta.streamingSeconds },
            cameraSeconds: { increment: delta.cameraSeconds },
            mutedSeconds: { increment: delta.mutedSeconds },
            deafenedSeconds: { increment: delta.deafenedSeconds },
            onlineSeconds: { increment: delta.onlineSeconds },
            idleSeconds: { increment: delta.idleSeconds },
            dndSeconds: { increment: delta.dndSeconds },
            invitesCount: { increment: delta.invitesCount },
            messagesClearedCount: { increment: delta.messagesClearedCount },
            moderationActionsCount: { increment: delta.moderationActionsCount },
            topGameName: topGame ?? undefined,
            topGameSeconds: maxGameSec,
            gameActivity: mergedGames,
            spotifySeconds: { increment: delta.spotifySeconds },
            topSpotifyTrack: topTrack ?? undefined,
            topSpotifyArtist: topArtist ?? undefined,
            spotifyTracks: mergedSpotifyTracks,
            spotifyArtists: mergedSpotifyArtists,
            customStatusQuotes: mergedStatuses,
            boostingSeconds: { increment: delta.boostingSeconds },
            isBooster: delta.isBooster,
            topEmojis: mergedEmojis,
            hourlyActivity: mergedHourly,
            dailyActivity: mergedDaily,
          },
        });


        // Upsert LynxCommandUsage
        for (const [cmdName, cnt] of Object.entries(delta.commandCounts)) {
          await prisma.lynxCommandUsage.upsert({
            where: {
              guildId_userId_year_commandName: { guildId, userId, year, commandName: cmdName },
            },
            create: {
              guildId,
              userId,
              year,
              commandName: cmdName,
              count: cnt,
            },
            update: {
              count: { increment: cnt },
            },
          });
        }
      } catch (err) {
        console.error(`[RewindBuffer] Failed to flush stats for key ${key}:`, err);
      }
    }
  }
}

export const rewindBuffer = new RewindBufferService();

