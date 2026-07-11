// @ts-nocheck
import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  rrBadRequestException,
  rrNotFoundException,
  rrInternalServerErrorException,
} from 'src/providers/error';
import { PrismaService } from '../../providers/database/prisma.service';
import { ConnectionLinkedTo, ConnectionProvider } from '@runa/database';
import { ConnectionLoader, ConnectionCapability } from '@runa/connections';
import { AnimeService } from '../anime/anime.service';
import { MangaService } from '../manga/manga.service';
import { MovieService } from '../movie/movie.service';
import { TvService } from '../tv/tv.service';
import { StatsService } from '../stats/stats.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ConnectionService implements OnModuleInit {
  private loader: ConnectionLoader;
  private activeImports = new Map<
    string,
    {
      total: number;
      processed: number;
      status: 'processing' | 'completed' | 'failed';
      error?: string;
      failedItems?: {
        title: string;
        providerId: number | string;
        reason: string;
        mediaType: string;
      }[];
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly animeService: AnimeService,
    private readonly mangaService: MangaService,
    private readonly movieService: MovieService,
    private readonly tvService: TvService,
    private readonly statsService: StatsService,
    private readonly notificationService: NotificationService,
  ) {}

  // Module code identifier
  private readonly moduleCode = 'CnSve-';

  async onModuleInit(): Promise<void> {
    this.loader = new ConnectionLoader({
      prisma: this.prisma,
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', // DevSkim: ignore DS137138, DS162092
      env: process.env,
    });

    await this.loader.loadConnections();
    console.log(
      '[ConnectionLoader Debug] ConnectionProvider keys:',
      Object.keys(ConnectionProvider),
    );
    console.log(
      '[ConnectionLoader Debug] Loaded connections:',
      Array.from(this.loader.getConnections().keys()),
    );
  }

  private toProvider(value: string): ConnectionProvider {
    const upper = value.toUpperCase() as ConnectionProvider;
    if (!Object.values(ConnectionProvider).includes(upper)) {
      throw new rrBadRequestException(`${this.moduleCode}IP001`, {
        message: `Invalid provider: ${value}`,
      });
    }
    return upper;
  }

  public getConnectionInstance(providerId: string): any {
    const provider = this.loader.getConnection(this.toProvider(providerId));
    if (!provider) {
      throw new rrBadRequestException(`${this.moduleCode}IP002`, {
        message: `Invalid provider: ${providerId}`,
      });
    }
    if (!provider.isEnabled) {
      throw new rrBadRequestException(`${this.moduleCode}EMCC001`, {
        message: 'ENV MISSING CHECK CONSOLE',
      });
    }
    return provider;
  }

  async getAuthUrl(
    providerId: string,
    token: string,
    redirectUrl?: string,
  ): Promise<string> {
    const provider = this.getConnectionInstance(providerId);
    return provider.getAuthUrl(token, redirectUrl);
  }

  async handleCallback(
    providerId: string,
    code: string,
    username: string,
  ): Promise<any> {
    const provider = this.getConnectionInstance(providerId);
    return provider.handleCallback(code, username);
  }

  async findAll(
    username: string,
    linkedTo?: ConnectionLinkedTo,
    capabilities?: string | string[],
  ): Promise<ConnectionEntity[]> {
    const connections = await this.prisma.client.connections.findMany({
      where: {
        username,
        linkedTo: linkedTo ?? undefined,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        linkedUsername: true,
        connectionId: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        linkedTo: true,
        private: true,
        metadata: true,
      },
    });

    let capabilitiesFilter: ConnectionCapability[] | undefined;
    if (capabilities) {
      const rawCaps = Array.isArray(capabilities)
        ? capabilities
        : typeof capabilities === 'string'
          ? capabilities.split(',')
          : [];
      capabilitiesFilter = rawCaps
        .map((cap) => cap.trim().toUpperCase() as ConnectionCapability)
        .filter((cap) => Object.values(ConnectionCapability).includes(cap));
    }

    if (capabilitiesFilter && capabilitiesFilter.length > 0) {
      return connections.filter((conn) => {
        try {
          const providerInstance = this.loader.getConnection(conn.provider);
          if (!providerInstance) return false;
          return providerInstance.capabilities.some((cap) =>
            capabilitiesFilter.includes(cap),
          );
        } catch {
          return false;
        }
      });
    }

    return connections;
  }

  async upsert(
    username: string,
    data: {
      provider: string;
      linkedUsername?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
      connectionId?: string;
      linkedTo?: ConnectionLinkedTo;
      private?: boolean;
      metadata?: Record<string, unknown>;
    },
  ): Promise<ConnectionEntity> {
    const provider = this.toProvider(data.provider);

    const connection = await this.prisma.client.connections.upsert({
      where: {
        username_provider: { username, provider },
      },
      update: {
        linkedUsername: data.linkedUsername,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        connectionId: data.connectionId,
        linkedTo: data.linkedTo,
        private: data.private,
        metadata: data.metadata,
      },
      create: {
        username,
        provider,
        linkedUsername: data.linkedUsername,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        connectionId: data.connectionId,
        linkedTo: data.linkedTo,
        private: data.private,
        metadata: data.metadata,
      },
    });

    return {
      id: connection.id,
      provider: connection.provider,
      linkedUsername: connection.linkedUsername,
      connectionId: connection.connectionId,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      expiresAt: connection.expiresAt,
      linkedTo: connection.linkedTo,
      private: connection.private,
      metadata: connection.metadata,
    };
  }

  async remove(
    username: string,
    providerRaw: string,
  ): Promise<{ success: boolean }> {
    const provider = this.toProvider(providerRaw);

    const existing = await this.prisma.client.connections.findUnique({
      where: {
        username_provider: { username, provider },
      },
    });

    if (!existing) {
      throw new rrNotFoundException(`${this.moduleCode}CNF001`, {
        message: 'Connection not found',
      });
    }

    await this.prisma.client.connections.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }

  public getImportStatus(
    username: string,
    providerId: string,
  ): {
    total: number;
    processed: number;
    status: string;
    error?: string;
    failedItems?: {
      title: string;
      providerId: number | string;
      reason: string;
      mediaType: string;
    }[];
  } {
    const key = `${username.toLowerCase()}:${providerId.toLowerCase()}`;
    return (
      this.activeImports.get(key) || {
        total: 0,
        processed: 0,
        status: 'completed',
      }
    );
  }

  public async startImport(
    username: string,
    providerId: string,
    mediaTypes?: string[],
  ): Promise<{ status: string }> {
    const key = `${username.toLowerCase()}:${providerId.toLowerCase()}`;
    const active = this.activeImports.get(key);
    if (active && active.status === 'processing') {
      throw new rrBadRequestException(`${this.moduleCode}IAIP003`, {
        message: 'Import already in progress',
      });
    }

    const providerInstance = this.getConnectionInstance(providerId);
    if (!providerInstance.fetchUserList) {
      throw new rrBadRequestException(`${this.moduleCode}PDSIL001`, {
        message: `Provider ${providerId} does not support importing lists`,
      });
    }

    this.activeImports.set(key, {
      total: 0,
      processed: 0,
      status: 'processing',
    });

    // Trigger background import without awaiting it
    this.runImportInBackground(username, providerId, mediaTypes).catch(
      (err) => {
        console.error(
          'Background import failed for user %s on provider %s:',
          username,
          providerId,
          err,
        );
      },
    );

    return { status: 'processing' };
  }

  private async runImportInBackground(
    username: string,
    providerId: string,
    mediaTypes?: string[],
  ): Promise<void> {
    const key = `${username.toLowerCase()}:${providerId.toLowerCase()}`;
    const providerKey = this.toProvider(providerId);
    const providerInstance = this.getConnectionInstance(providerId);
    const failedItems: {
      title: string;
      providerId: number | string;
      reason: string;
      mediaType: string;
    }[] = [];

    try {
      if (!providerInstance.fetchUserList) {
        throw new rrInternalServerErrorException(`${this.moduleCode}PDSIL001`, {
          message: `Provider ${providerId} does not support importing lists`,
        });
      }

      const items = await providerInstance.fetchUserList(username);

      const filteredItems =
        mediaTypes && mediaTypes.length > 0
          ? items.filter((item) => mediaTypes.includes(item.mediaType))
          : items;

      this.activeImports.set(key, {
        total: filteredItems.length,
        processed: 0,
        status: 'processing',
        failedItems,
      });

      // Before we iterate, we can resolve any missing AniList IDs for MAL / Simkl items
      // (MAL is already resolved in MalConnection, but Simkl might have missing AniList IDs for some Anime)
      const missingAnilistAnime = filteredItems.filter(
        (item) => item.mediaType === 'anime' && !item.anilistId && item.malId,
      );
      if (missingAnilistAnime.length > 0) {
        const malIds = missingAnilistAnime.map((item) => item.malId);
        const resolvedMap = await this.resolveMalToAnilistIds(malIds);
        for (const item of missingAnilistAnime) {
          if (item.malId && resolvedMap[item.malId]) {
            item.anilistId = resolvedMap[item.malId];
          }
        }
      }

      let processed = 0;
      for (const item of filteredItems) {
        const itemTitle =
          typeof item.title === 'object'
            ? item.title.romaji ||
              item.title.english ||
              item.title.native ||
              'Unknown'
            : item.title || 'Unknown';
        const providerItemId =
          item.anilistId || item.malId || item.tvdbId || item.simklId || 0;

        try {
          if (item.mediaType === 'anime') {
            if (!item.anilistId) {
              const errMsg = `Could not resolve AniList ID for MAL Anime ID ${item.malId}`;
              console.warn(errMsg);
              failedItems.push({
                title: itemTitle,
                providerId: providerItemId,
                reason: 'Could not resolve AniList ID',
                mediaType: 'anime',
              });
              continue;
            }
            // 1. Ensure Anime exists in db
            const dbAnime = await this.animeService.ensureAnime(
              item.anilistId,
              item.malId,
              itemTitle,
              item.coverImage,
            );
            const animeId = dbAnime?.id;
            if (!animeId) {
              const errMsg = `Failed to ensure Anime with AniList ID ${item.anilistId}`;
              console.warn(errMsg);
              failedItems.push({
                title: itemTitle,
                providerId: providerItemId,
                reason: 'Failed to create Anime record in DB',
                mediaType: 'anime',
              });
              continue;
            }

            // 2. Conflict Resolution: Additive import
            const existing =
              await this.prisma.client.aquilaAnimeUserList.findUnique({
                where: {
                  username_animeId: { username, animeId },
                },
              });

            const connectionItemId = item.anilistId; // For AniList connection, the ID is anilistId
            let finalItemId = connectionItemId;
            if (providerKey === ConnectionProvider.MAL) {
              finalItemId = item.malId;
            } else if (providerKey === ConnectionProvider.SIMKL) {
              finalItemId = item.simklId || item.anilistId;
            }

            if (existing) {
              const connections = this.mergeConnections(
                existing.connections,
                providerId,
                finalItemId,
              );
              await this.prisma.client.aquilaAnimeUserList.update({
                where: { id: existing.id },
                data: {
                  connections,
                  ...(item.startDate !== undefined && {
                    startDate: item.startDate || null,
                  }),
                  ...(item.endDate !== undefined && {
                    endDate: item.endDate || null,
                  }),
                },
              });
            } else {
              await this.prisma.client.aquilaAnimeUserList.create({
                data: {
                  username,
                  animeId,
                  status: item.status,
                  progress: item.progress || 0,
                  score: item.score || 0,
                  notes: item.notes || '',
                  connections: {
                    [providerId.toLowerCase()]: { id: finalItemId, sync: true },
                  },
                  startDate: item.startDate || null,
                  endDate: item.endDate || null,
                },
              });
            }
          } else if (item.mediaType === 'manga') {
            if (!item.anilistId) {
              const errMsg = `Could not resolve AniList ID for MAL Manga ID ${item.malId}`;
              console.warn(errMsg);
              failedItems.push({
                title: itemTitle,
                providerId: providerItemId,
                reason: 'Could not resolve AniList ID',
                mediaType: 'manga',
              });
              continue;
            }
            // 1. Ensure Manga exists in db
            const dbManga = await this.mangaService.ensureManga(
              item.anilistId,
              item.malId,
              itemTitle,
              item.coverImage,
            );
            const mangaId = dbManga?.id;
            if (!mangaId) {
              const errMsg = `Failed to ensure Manga with AniList ID ${item.anilistId}`;
              console.warn(errMsg);
              failedItems.push({
                title: itemTitle,
                providerId: providerItemId,
                reason: 'Failed to create Manga record in DB',
                mediaType: 'manga',
              });
              continue;
            }

            // 2. Conflict Resolution
            const existing =
              await this.prisma.client.aquilaMangaUserList.findUnique({
                where: {
                  username_mangaId: { username, mangaId },
                },
              });

            let finalItemId = item.anilistId;
            if (providerKey === ConnectionProvider.MAL) {
              finalItemId = item.malId;
            } else if (providerKey === ConnectionProvider.SIMKL) {
              finalItemId = item.simklId || item.anilistId;
            }

            if (existing) {
              const connections = this.mergeConnections(
                existing.connections,
                providerId,
                finalItemId,
              );
              await this.prisma.client.aquilaMangaUserList.update({
                where: { id: existing.id },
                data: {
                  connections,
                  ...(item.startDate !== undefined && {
                    startDate: item.startDate || null,
                  }),
                  ...(item.endDate !== undefined && {
                    endDate: item.endDate || null,
                  }),
                },
              });
            } else {
              await this.prisma.client.aquilaMangaUserList.create({
                data: {
                  username,
                  mangaId,
                  status: item.status,
                  chapters: item.progress || 0,
                  volumes: item.volumesProgress || 0,
                  score: item.score || 0,
                  notes: item.notes || '',
                  connections: {
                    [providerId.toLowerCase()]: { id: finalItemId, sync: true },
                  },
                  startDate: item.startDate || null,
                  endDate: item.endDate || null,
                },
              });
            }
          } else if (item.mediaType === 'tv') {
            if (!item.tvdbId) {
              const errMsg = `Skipping TV show "${item.title}" as it lacks TVDB ID`;
              console.warn(errMsg);
              failedItems.push({
                title: itemTitle,
                providerId: providerItemId,
                reason: 'Lacks TVDB ID',
                mediaType: 'tv',
              });
              continue;
            }
            // 1. Ensure TV exists in db
            const dbTv = await this.tvService.ensureTv(
              item.tvdbId,
              item.title,
              item.coverImage,
            );
            const tvId = dbTv?.id;
            if (!tvId) {
              const errMsg = `Failed to ensure TV series with TVDB ID ${item.tvdbId}`;
              console.warn(errMsg);
              failedItems.push({
                title: itemTitle,
                providerId: providerItemId,
                reason: 'Failed to create TV record in DB',
                mediaType: 'tv',
              });
              continue;
            }

            // 2. Conflict Resolution
            const existing =
              await this.prisma.client.aquilaTvUserList.findUnique({
                where: { username_tvId: { username, tvId } },
              });

            const finalItemId =
              providerKey === ConnectionProvider.SIMKL
                ? item.simklId || item.tvdbId
                : item.tvdbId;

            let listEntryId: number;

            if (existing) {
              const connections = this.mergeConnections(
                existing.connections,
                providerId,
                finalItemId,
              );
              await this.prisma.client.aquilaTvUserList.update({
                where: { id: existing.id },
                data: {
                  connections,
                  ...(item.startDate !== undefined && {
                    startDate: item.startDate || null,
                  }),
                  ...(item.endDate !== undefined && {
                    endDate: item.endDate || null,
                  }),
                },
              });
              listEntryId = existing.id;
            } else {
              let tvStatus = 'PLANNING';
              if (item.status === 'WATCHING') tvStatus = 'WATCHING';
              else if (item.status === 'COMPLETED') tvStatus = 'COMPLETED';
              else if (item.status === 'DROPPED') tvStatus = 'DROPPED';

              const listEntry =
                await this.prisma.client.aquilaTvUserList.create({
                  data: {
                    username,
                    tvId,
                    status: tvStatus as any,
                    score: item.score || 0,
                    notes: item.notes || '',
                    connections: {
                      [providerId.toLowerCase()]: {
                        id: finalItemId,
                        sync: true,
                      },
                    },
                    startDate: item.startDate || null,
                    endDate: item.endDate || null,
                  },
                });
              listEntryId = listEntry.id;
            }

            // Sync watched episodes if there is progress or a list of episodes
            if (
              item.watchedEpisodes &&
              Array.isArray(item.watchedEpisodes) &&
              item.watchedEpisodes.length > 0
            ) {
              const episodesData = item.watchedEpisodes.map((ep: any) => ({
                listId: listEntryId,
                seasonNum: ep.seasonNum,
                episodeNum: ep.episodeNum,
              }));
              await this.prisma.client.aquilaTvWatchedEpisode.createMany({
                data: episodesData,
                skipDuplicates: true,
              });
            } else if (item.progress > 0) {
              const dbTv = await this.prisma.client.aquilaTv.findUnique({
                where: { tvdbId: item.tvdbId },
                select: { seasons: true },
              });

              const seasons = dbTv?.seasons as any[];
              if (seasons && Array.isArray(seasons) && seasons.length > 0) {
                const episodesData: {
                  listId: number;
                  seasonNum: number;
                  episodeNum: number;
                }[] = [];
                let remaining = item.progress;

                // Sort seasons by number (excluding specials / season 0 if any)
                const sortedSeasons = [...seasons]
                  .filter((s) => s.number > 0)
                  .sort((a, b) => a.number - b.number);

                for (const season of sortedSeasons) {
                  if (remaining <= 0) break;
                  const count =
                    season.episodeCount ||
                    (season.episodes ? season.episodes.length : 0) ||
                    0;
                  const take = Math.min(remaining, count);

                  for (let i = 0; i < take; i++) {
                    const epNum = season.episodes?.[i]?.number || i + 1;
                    episodesData.push({
                      listId: listEntryId,
                      seasonNum: season.number,
                      episodeNum: epNum,
                    });
                  }
                  remaining -= take;
                }

                // Fallback: if there is still remaining progress, or we had no matched seasons
                if (remaining > 0) {
                  const offset = episodesData.length;
                  for (let i = 0; i < remaining; i++) {
                    episodesData.push({
                      listId: listEntryId,
                      seasonNum: 1,
                      episodeNum: offset + i + 1,
                    });
                  }
                }

                if (episodesData.length > 0) {
                  await this.prisma.client.aquilaTvWatchedEpisode.createMany({
                    data: episodesData,
                    skipDuplicates: true,
                  });
                }
              } else {
                // Fallback: mark everything as season 1
                const episodesData = Array.from(
                  { length: item.progress },
                  (_, i) => ({
                    listId: listEntryId,
                    seasonNum: 1,
                    episodeNum: i + 1,
                  }),
                );
                await this.prisma.client.aquilaTvWatchedEpisode.createMany({
                  data: episodesData,
                  skipDuplicates: true,
                });
              }
            }
          } else if (item.mediaType === 'movie') {
            if (!item.tvdbId) {
              const errMsg = `Skipping movie "${item.title}" as it lacks TVDB ID`;
              console.warn(errMsg);
              failedItems.push({
                title: itemTitle,
                providerId: providerItemId,
                reason: 'Lacks TVDB ID',
                mediaType: 'movie',
              });
              continue;
            }
            // 1. Ensure Movie exists in db
            const dbMovie = await this.movieService.ensureMovie(
              item.tvdbId,
              item.title,
              item.coverImage,
            );
            const movieId = dbMovie?.id;
            if (!movieId) {
              const errMsg = `Failed to ensure movie with TVDB ID ${item.tvdbId}`;
              console.warn(errMsg);
              failedItems.push({
                title: itemTitle,
                providerId: providerItemId,
                reason: 'Failed to create movie record in DB',
                mediaType: 'movie',
              });
              continue;
            }

            // 2. Conflict Resolution
            const existing =
              await this.prisma.client.aquilaMovieUserList.findUnique({
                where: { username_movieId: { username, movieId } },
              });

            const finalItemId =
              providerKey === ConnectionProvider.SIMKL
                ? item.simklId || item.tvdbId
                : item.tvdbId;

            if (existing) {
              const connections = this.mergeConnections(
                existing.connections,
                providerId,
                finalItemId,
              );
              await this.prisma.client.aquilaMovieUserList.update({
                where: { id: existing.id },
                data: {
                  connections,
                  ...(item.startDate !== undefined && {
                    startDate: item.startDate || null,
                  }),
                  ...(item.endDate !== undefined && {
                    endDate: item.endDate || null,
                  }),
                },
              });
            } else {
              let movieStatus = 'PLANNING';
              if (item.status === 'COMPLETED') movieStatus = 'COMPLETED';
              else if (item.status === 'DROPPED') movieStatus = 'DROPPED';

              await this.prisma.client.aquilaMovieUserList.create({
                data: {
                  username,
                  movieId,
                  status: movieStatus as any,
                  score: item.score || 0,
                  notes: item.notes || '',
                  connections: {
                    [providerId.toLowerCase()]: { id: finalItemId, sync: true },
                  },
                  startDate: item.startDate || null,
                  endDate: item.endDate || null,
                },
              });
            }
          }
        } catch (err: any) {
          console.error(
            `Failed to import media item "${itemTitle}" in background:`,
            err.message,
          );
          failedItems.push({
            title: itemTitle,
            providerId: providerItemId,
            reason: err.message || 'Unknown database or network error',
            mediaType: item.mediaType,
          });
        }
        processed++;
        this.activeImports.set(key, {
          total: filteredItems.length,
          processed,
          status: 'processing',
          failedItems,
        });
      }

      this.activeImports.set(key, {
        total: filteredItems.length,
        processed,
        status: 'completed',
        failedItems,
      });

      try {
        const user = await this.prisma.client.user.findFirst({
          where: { username: { equals: username, mode: 'insensitive' } },
        });
        if (user) {
          const importedTypes = Array.from(
            new Set(filteredItems.map((item) => item.mediaType)),
          );
          for (const mediaType of importedTypes as string[]) {
            try {
              await this.statsService.recalculate(user.id, mediaType);
            } catch (err: any) {
              console.error(
                `Failed to trigger stats recalculation for ${mediaType}:`,
                err.message,
              );
            }
          }
        }
      } catch (err: any) {
        console.error(
          'Failed to resolve user for stats recalculation:',
          err.message,
        );
      }
    } catch (error: any) {
      const isRateLimit =
        error.message?.includes('Too Many Requests') ||
        error.message?.includes('429');

      if (isRateLimit) {
        console.warn(
          `Background import rate limited for user ${username}: ${error.message}`,
        );
        this.activeImports.set(key, {
          total: 0,
          processed: 0,
          status: 'failed',
          error: error.message,
          failedItems,
        });

        try {
          const user = await this.prisma.client.user.findFirst({
            where: { username: { equals: username, mode: 'insensitive' } },
          });
          if (user) {
            await this.notificationService.create(user.id, {
              title: 'AniList Import Rate Limited',
              message:
                'The import process was rate limited by AniList. Please try again later.',
              type: 'INFO',
            });
          }
        } catch (notificationErr: any) {
          console.error(
            `Failed to send rate limit notification to user:`,
            notificationErr.message,
          );
        }
      } else {
        console.error(`Background import failed:`, error);
        this.activeImports.set(key, {
          total: 0,
          processed: 0,
          status: 'failed',
          error: error.message,
          failedItems,
        });
      }
    }
  }

  private mergeConnections(
    existingConnections: any,
    providerId: string,
    connectionItemId: number,
  ): any {
    const connections =
      existingConnections && typeof existingConnections === 'object'
        ? { ...existingConnections }
        : {};
    connections[providerId.toLowerCase()] = {
      id: connectionItemId,
      sync: true,
    };
    return connections;
  }

  private async resolveMalToAnilistIds(
    malIds: number[],
  ): Promise<Record<number, number>> {
    const malToAnilistMap: Record<number, number> = {};
    const batchSize = 40;
    const maxRetries = 5;
    const baseDelay = 1000;

    for (let i = 0; i < malIds.length; i += batchSize) {
      const batch = malIds.slice(i, i + batchSize);
      let res: Response | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Proactive delay to avoid hitting rate limit
          await new Promise((resolve) => setTimeout(resolve, 750));

          res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `
                query ($idMal: [Int]) {
                  Page(page: 1, perPage: 50) {
                    media(idMal_in: $idMal, type: ANIME) {
                      id
                      idMal
                    }
                  }
                }
              `,
              variables: {
                idMal: batch,
              },
            }),
          });

          if (res.status === 429) {
            const retryAfter = res.headers.get('retry-after');
            const waitTime = retryAfter
              ? parseInt(retryAfter, 10) * 1000 + 1000
              : baseDelay * Math.pow(2, attempt);
            console.warn(
              `AniList rate limit hit (429) during MAL ID resolution. Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          break;
        } catch (err: any) {
          if (attempt === maxRetries - 1) {
            console.error(`resolveMalToAnilistIds network error:`, err.message);
          } else {
            const waitTime = baseDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }

      if (res && res.ok) {
        try {
          const json = await res.json();
          const mediaList = json?.data?.Page?.media || [];
          for (const media of mediaList) {
            if (media.id && media.idMal) {
              malToAnilistMap[media.idMal] = media.id;
            }
          }
        } catch (err: any) {
          console.error(
            `resolveMalToAnilistIds json parse error:`,
            err.message,
          );
        }
      }
    }
    return malToAnilistMap;
  }
}
