import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import ListEntity from './entities/ListEntity';
import { $Enums } from '@runa/database';

@Injectable()
export class ListService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(ListService.name);

  public async getAnimeList(username: string): Promise<ListEntity[]> {
    const list = await this.prisma.client.aquilaAnimeUserList.findMany({
      where: {
        username: username.toLowerCase(),
      },
      select: {
        animeId: true,
        status: true,
        progress: true,
        score: true,
        updatedAt: true,
        createdAt: true,
        anime: {
          select: {
            titleEnglish: true,
            titleRomaji: true,
            titleNative: true,
            coverImageLarge: true,
            episodes: true,
            format: true,
          },
        },
      },
    });

    if (!list.length) {
      return [];
    }

    const mappedList: ListEntity[] = list.map((item) => {
      return {
        id: item.animeId,
        title:
          item.anime.titleEnglish ??
          item.anime.titleRomaji ??
          item.anime.titleNative ??
          '',
        score: item.score,
        progress: item.progress,
        episodes: item.anime.episodes,
        image: item.anime.coverImageLarge ?? '',
        format: item.anime.format,
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'anime',
      };
    });

    return mappedList;
  }

  public async getAnimeListEntry(username: string, animeId: number) {
    const out = await this.prisma.client.aquilaAnimeUserList.findUnique({
      where: {
        username_animeId: {
          username: username.toLowerCase(),
          animeId,
        },
      },
    });

    if (!out) throw new NotFoundException('Anime not found in list');
    return out;
  }

  public async upsertAnimeList(
    username: string,
    body: {
      animeId: number;
      status?: $Enums.AnimeListStatus;
      progress?: number;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      rewatched?: number;
      updateConnection?: boolean;
      connections?: {
        anilist?: number;
        mal?: number;
      };
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaAnimeUserList.upsert({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId: body.animeId,
          },
        },
        update: {
          status: body.status,
          progress: body.progress,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          animeId: body.animeId,
          status: body.status,
          progress: body.progress,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
      });

      if (body.updateConnection) {
        await this.updateConnections(
          username.toLowerCase(),
          body.animeId,
          body.connections || {},
          body.status,
          body.progress,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.rewatched,
        );
      }
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update anime list',
        error: error,
      };
    }

    return {
      success: true,
      message: 'Anime list updated successfully',
    };
  }

  public async deleteAnimeList(
    username: string,
    animeId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaAnimeUserList.delete({
        where: {
          username_animeId: {
            username: username.toLowerCase(),
            animeId,
          },
        },
      });
      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete anime from list',
        error: error,
      };
    }
  }

  private async updateConnections(
    username: string,
    animeId: number,
    connections: { anilist?: number; mal?: number },
    status?: string,
    progress?: number,
    score?: number,
    startDate?: number,
    endDate?: number,
    notes?: string,
    rewatched?: number,
  ) {
    if (connections.anilist) {
      const anilistConnection = await this.prisma.client.connections.findFirst({
        where: {
          username: username,
          provider: 'ANILIST',
        },
        select: {
          accessToken: true,
          refreshToken: true,
          expiresAt: true,
        },
      });

      if (!anilistConnection) {
        this.logger.warn(`No Anilist connection found for user ${username}`);
        return;
      }

      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anilistConnection.accessToken}`,
        },
        body: JSON.stringify({
          query: `
            mutation (
              $mediaId: Int!
              $status: MediaListStatus
              $progress: Int
              $score: Float
              $startedAt: FuzzyDateInput
              $completedAt: FuzzyDateInput
              $notes: String
              $repeat: Int
            ) {
              SaveMediaListEntry(
                mediaId: $mediaId
                status: $status
                progress: $progress
                score: $score
                startedAt: $startedAt
                completedAt: $completedAt
                notes: $notes
                repeat: $repeat
              ) {
                id
                status
                progress
                score
                startedAt {
                  year
                  month
                  day
                }
                completedAt {
                  year
                  month
                  day
                }
                notes
                repeat
              }
            }
          `,
          variables: {
            mediaId: Number(connections.anilist),
            status: status === 'WATCHING' ? 'CURRENT' : status,
            progress: progress,
            score: score,
            startedAt: startDate
              ? {
                  year: new Date(startDate * 1000).getFullYear(),
                  month: new Date(startDate * 1000).getMonth() + 1,
                  day: new Date(startDate * 1000).getDate(),
                }
              : undefined,
            completedAt: endDate
              ? {
                  year: new Date(endDate * 1000).getFullYear(),
                  month: new Date(endDate * 1000).getMonth() + 1,
                  day: new Date(endDate * 1000).getDate(),
                }
              : undefined,
            notes: notes,
            repeat: rewatched,
          },
        }),
      });

      if (!res.ok) {
        this.logger.error(
          `Failed to update Anilist connection for user ${username}`,
        );
        return;
      }

      const data = await res.json();
      if (data.errors) {
        this.logger.error(
          `Failed to update Anilist connection for user ${username}`,
        );
        return;
      }

      this.logger.log(`Anilist connection updated for user ${username}`);
    }

    if (connections.mal) {
      const malConnection = await this.prisma.client.connections.findFirst({
        where: {
          username: username,
          provider: 'MAL',
        },
        select: {
          id: true,
          accessToken: true,
          refreshToken: true,
          expiresAt: true,
        },
      });

      if (!malConnection) {
        this.logger.warn(`No MAL connection found for user ${username}`);
        return;
      }

      let accessToken = malConnection.accessToken;

      if (
        malConnection.expiresAt &&
        Date.now() > malConnection.expiresAt.getTime()
      ) {
        const refreshRes = await fetch(
          'https://myanimelist.net/v1/oauth2/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.MAL_CLIENT_ID || '',
              client_secret: process.env.MAL_CLIENT_SECRET || '',
              grant_type: 'refresh_token',
              refresh_token: malConnection.refreshToken || '',
            }),
          },
        );

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          accessToken = refreshData.access_token;
          await this.prisma.client.connections.update({
            where: { id: malConnection.id },
            data: {
              accessToken: refreshData.access_token,
              refreshToken: refreshData.refresh_token,
              expiresAt: new Date(Date.now() + refreshData.expires_in * 1000),
            },
          });
          this.logger.log(`MAL token refreshed for user ${username}`);
        } else {
          this.logger.error(`Failed to refresh MAL token for user ${username}`);
        }
      }

      let malStatus: string | undefined = undefined;
      switch (status) {
        case 'WATCHING':
          malStatus = 'watching';
          break;
        case 'COMPLETED':
          malStatus = 'completed';
          break;
        case 'PAUSED':
          malStatus = 'on_hold';
          break;
        case 'DROPPED':
          malStatus = 'dropped';
          break;
        case 'PLANNING':
          malStatus = 'plan_to_watch';
          break;
        case 'REPEATING':
          malStatus = 'watching';
          break;
      }

      const malData = new URLSearchParams();
      if (malStatus) malData.append('status', malStatus);
      if (score !== undefined)
        malData.append('score', Math.round(score).toString());
      if (progress !== undefined)
        malData.append('num_watched_episodes', progress.toString());
      if (status === 'REPEATING') malData.append('is_rewatching', 'true');
      if (rewatched !== undefined)
        malData.append('num_times_rewatched', rewatched.toString());
      if (notes !== undefined) malData.append('comments', notes);

      const parseDateStr = (ts?: number) => {
        if (!ts) return undefined;
        const d = new Date(ts * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      if (startDate) {
        const startString = parseDateStr(startDate);
        if (startString) malData.append('start_date', startString);
      }
      if (endDate) {
        const endString = parseDateStr(endDate);
        if (endString) malData.append('finish_date', endString);
      }

      if (Number.isNaN(connections.mal)) {
        this.logger.error(`MAL ID is not a number`);
        return;
      }
      if (Number(connections.mal) < 0) {
        this.logger.error(`MAL ID cannot be negative`);
        return;
      }

      const res = await fetch(
        `https://api.myanimelist.net/v2/anime/${connections.mal}/my_list_status`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: malData,
        },
      );

      if (!res.ok) {
        this.logger.error(
          `Failed to update MAL connection for user ${username}`,
        );
      } else {
        this.logger.log(`MAL connection updated for user ${username}`);
      }
    }
  }

  public async getMangaList(username: string): Promise<ListEntity[]> {
    const list = await this.prisma.client.aquilaMangaUserList.findMany({
      where: { username: username.toLowerCase() },
      select: {
        mangaId: true,
        status: true,
        chapters: true,
        volumes: true,
        score: true,
        updatedAt: true,
        createdAt: true,
        manga: {
          select: {
            titleEnglish: true,
            titleRomaji: true,
            titleNative: true,
            coverImageLarge: true,
            chapters: true,
            format: true,
          },
        },
      },
    });

    if (!list.length) {
      return [];
    }

    return list.map((item) => ({
      id: item.mangaId,
      title:
        item.manga.titleEnglish ??
        item.manga.titleRomaji ??
        item.manga.titleNative ??
        '',
      score: item.score,
      progress: item.chapters,
      episodes: item.manga.chapters,
      image: item.manga.coverImageLarge ?? '',
      format: item.manga.format,
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'manga',
    }));
  }

  public async getMangaListEntry(username: string, mangaId: number) {
    return this.prisma.client.aquilaMangaUserList.findUnique({
      where: {
        username_mangaId: {
          username: username.toLowerCase(),
          mangaId,
        },
      },
    });
  }

  public async upsertMangaList(
    username: string,
    body: {
      mangaId: number;
      status?: $Enums.MangaListStatus;
      chapters?: number;
      volumes?: number;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      reread?: number;
      updateConnection?: boolean;
      connections?: {
        anilist?: number;
        mal?: number;
      };
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaMangaUserList.upsert({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId: body.mangaId,
          },
        },
        update: {
          status: body.status,
          chapters: body.chapters,
          volumes: body.volumes,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          reread: body.reread,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          mangaId: body.mangaId,
          status: body.status,
          chapters: body.chapters,
          volumes: body.volumes,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          reread: body.reread,
          connections: body.connections,
        },
      });

      if (body.updateConnection) {
        await this.updateMangaConnections(
          username.toLowerCase(),
          body.mangaId,
          body.connections || {},
          body.status,
          body.chapters,
          body.volumes,
          body.score,
          body.startDate,
          body.endDate,
          body.notes,
          body.reread,
        );
      }
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update manga list',
        error: error,
      };
    }

    return {
      success: true,
      message: 'Manga list updated successfully',
    };
  }

  public async deleteMangaList(
    username: string,
    mangaId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaMangaUserList.delete({
        where: {
          username_mangaId: {
            username: username.toLowerCase(),
            mangaId,
          },
        },
      });
      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete manga from list',
        error: error,
      };
    }
  }

  private async updateMangaConnections(
    username: string,
    mangaId: number,
    connections: { anilist?: number; mal?: number },
    status?: string,
    chapters?: number,
    volumes?: number,
    score?: number,
    startDate?: number,
    endDate?: number,
    notes?: string,
    reread?: number,
  ) {
    if (connections.anilist) {
      const anilistConnection = await this.prisma.client.connections.findFirst({
        where: { username, provider: 'ANILIST' },
        select: { accessToken: true, refreshToken: true, expiresAt: true },
      });

      if (!anilistConnection) {
        this.logger.warn(`No Anilist connection found for user ${username}`);
      } else {
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anilistConnection.accessToken}`,
          },
          body: JSON.stringify({
            query: `
              mutation (
                $mediaId: Int!
                $status: MediaListStatus
                $progress: Int
                $progressVolumes: Int
                $score: Float
                $startedAt: FuzzyDateInput
                $completedAt: FuzzyDateInput
                $notes: String
                $repeat: Int
              ) {
                SaveMediaListEntry(
                  mediaId: $mediaId
                  status: $status
                  progress: $progress
                  progressVolumes: $progressVolumes
                  score: $score
                  startedAt: $startedAt
                  completedAt: $completedAt
                  notes: $notes
                  repeat: $repeat
                ) {
                  id
                  status
                  progress
                  progressVolumes
                  score
                  notes
                  repeat
                }
              }
            `,
            variables: {
              mediaId: Number(connections.anilist),
              status: status === 'READING' ? 'CURRENT' : status,
              progress: chapters,
              progressVolumes: volumes,
              score: score,
              startedAt: startDate
                ? {
                    year: new Date(startDate * 1000).getFullYear(),
                    month: new Date(startDate * 1000).getMonth() + 1,
                    day: new Date(startDate * 1000).getDate(),
                  }
                : undefined,
              completedAt: endDate
                ? {
                    year: new Date(endDate * 1000).getFullYear(),
                    month: new Date(endDate * 1000).getMonth() + 1,
                    day: new Date(endDate * 1000).getDate(),
                  }
                : undefined,
              notes: notes,
              repeat: reread,
            },
          }),
        });

        if (!res.ok) {
          this.logger.error(
            `Failed to update Anilist manga connection for user ${username}`,
          );
        } else {
          const data = await res.json();
          if (data.errors) {
            this.logger.error(
              `Failed to update Anilist manga connection for user ${username}`,
            );
          } else {
            this.logger.log(
              `Anilist manga connection updated for user ${username}`,
            );
          }
        }
      }
    }

    if (connections.mal) {
      const malConnection = await this.prisma.client.connections.findFirst({
        where: { username, provider: 'MAL' },
        select: {
          id: true,
          accessToken: true,
          refreshToken: true,
          expiresAt: true,
        },
      });

      if (!malConnection) {
        this.logger.warn(`No MAL connection found for user ${username}`);
        return;
      }

      let accessToken = malConnection.accessToken;

      if (
        malConnection.expiresAt &&
        Date.now() > malConnection.expiresAt.getTime()
      ) {
        const refreshRes = await fetch(
          'https://myanimelist.net/v1/oauth2/token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.MAL_CLIENT_ID || '',
              client_secret: process.env.MAL_CLIENT_SECRET || '',
              grant_type: 'refresh_token',
              refresh_token: malConnection.refreshToken || '',
            }),
          },
        );

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          accessToken = refreshData.access_token;
          await this.prisma.client.connections.update({
            where: { id: malConnection.id },
            data: {
              accessToken: refreshData.access_token,
              refreshToken: refreshData.refresh_token,
              expiresAt: new Date(Date.now() + refreshData.expires_in * 1000),
            },
          });
          this.logger.log(`MAL token refreshed for user ${username}`);
        } else {
          this.logger.error(`Failed to refresh MAL token for user ${username}`);
        }
      }

      let malStatus: string | undefined = undefined;
      switch (status) {
        case 'READING':
          malStatus = 'reading';
          break;
        case 'COMPLETED':
          malStatus = 'completed';
          break;
        case 'ON_HOLD':
          malStatus = 'on_hold';
          break;
        case 'DROPPED':
          malStatus = 'dropped';
          break;
        case 'PLANNING':
          malStatus = 'plan_to_read';
          break;
      }

      const malData = new URLSearchParams();
      if (malStatus) malData.append('status', malStatus);
      if (score !== undefined)
        malData.append('score', Math.round(score).toString());
      if (chapters !== undefined)
        malData.append('num_chapters_read', chapters.toString());
      if (volumes !== undefined)
        malData.append('num_volumes_read', volumes.toString());
      if (reread !== undefined)
        malData.append('num_times_reread', reread.toString());
      if (notes !== undefined) malData.append('comments', notes);

      const parseDateStr = (ts?: number) => {
        if (!ts) return undefined;
        const d = new Date(ts * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      if (startDate) {
        const s = parseDateStr(startDate);
        if (s) malData.append('start_date', s);
      }
      if (endDate) {
        const e = parseDateStr(endDate);
        if (e) malData.append('finish_date', e);
      }

      if (Number.isNaN(connections.mal)) {
        this.logger.error(`MAL manga ID is not a number`);
        return;
      }
      if (Number(connections.mal) < 0) {
        this.logger.error(`MAL ID cannot be negative`);
        return;
      }

      const res = await fetch(
        `https://api.myanimelist.net/v2/manga/${connections.mal}/my_list_status`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: malData,
        },
      );

      if (!res.ok) {
        this.logger.error(
          `Failed to update MAL manga connection for user ${username}`,
        );
      } else {
        this.logger.log(`MAL manga connection updated for user ${username}`);
      }
    }
  }

  // ─────────────────────────── MOVIE ───────────────────────────

  public async getMovieList(username: string): Promise<ListEntity[]> {
    const list = await this.prisma.client.aquilaMovieUserList.findMany({
      where: {
        username: username.toLowerCase(),
      },
      select: {
        tvdbId: true,
        status: true,
        score: true,
        updatedAt: true,
        createdAt: true,
        movie: {
          select: {
            titleEnglish: true,
            titleRomaji: true,
            coverImage: true,
          },
        },
      },
    });

    if (!list.length) {
      return [];
    }

    return list.map((item) => ({
      id: item.tvdbId,
      title: item.movie.titleEnglish ?? item.movie.titleRomaji ?? '',
      score: item.score,
      progress: item.status === 'COMPLETED' ? 1 : 0,
      episodes: 1,
      image: item.movie.coverImage ?? '',
      status: item.status,
      last_updated: item.updatedAt,
      last_added: item.createdAt,
      type: 'movie',
      format: 'Movie',
    }));
  }

  public async getMovieListEntry(username: string, tvdbId: number) {
    const out = await this.prisma.client.aquilaMovieUserList.findUnique({
      where: {
        username_tvdbId: {
          username: username.toLowerCase(),
          tvdbId,
        },
      },
    });

    if (!out) throw new NotFoundException('Movie not found in list');
    return out;
  }

  public async upsertMovieList(
    username: string,
    body: {
      tvdbId: number;
      status?: $Enums.MovieListStatus;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      rewatched?: number;
      connections?: any;
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaMovieUserList.upsert({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId: body.tvdbId,
          },
        },
        update: {
          status: body.status,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          tvdbId: body.tvdbId,
          status: body.status,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
      });
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update movie list',
        error: error,
      };
    }

    return {
      success: true,
      message: 'Movie list updated successfully',
    };
  }

  public async deleteMovieList(
    username: string,
    tvdbId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaMovieUserList.delete({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId,
          },
        },
      });
      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete movie from list',
        error: error,
      };
    }
  }

  // ─────────────────────────── TV ───────────────────────────

  public async getTvList(username: string): Promise<ListEntity[]> {
    const list = await this.prisma.client.aquilaTvUserList.findMany({
      where: {
        username: username.toLowerCase(),
      },
      select: {
        tvdbId: true,
        status: true,
        score: true,
        updatedAt: true,
        createdAt: true,
        tv: {
          select: {
            titleEnglish: true,
            titleRomaji: true,
            coverImage: true,
            seasons: true,
          },
        },
        _count: {
          select: {
            watchedEpisodes: true,
          },
        },
      },
    });

    if (!list.length) {
      return [];
    }

    return list.map((item) => {
      // Calculate total episodes from seasons JSON
      let totalEpisodes = 0;
      const seasons = item.tv.seasons as any[];
      if (seasons) {
        seasons.forEach((s) => {
          totalEpisodes += s.episodeCount || 0;
        });
      }

      return {
        id: item.tvdbId,
        title: item.tv.titleEnglish ?? item.tv.titleRomaji ?? '',
        score: item.score,
        progress: item._count.watchedEpisodes,
        episodes: totalEpisodes,
        image: item.tv.coverImage ?? '',
        format: 'TV',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'tv',
      };
    });
  }

  public async getTvListEntry(username: string, tvdbId: number) {
    const out = await this.prisma.client.aquilaTvUserList.findUnique({
      where: {
        username_tvdbId: {
          username: username.toLowerCase(),
          tvdbId,
        },
      },
      include: {
        watchedEpisodes: true,
      },
    });

    if (!out) throw new NotFoundException('TV show not found in list');
    return out;
  }

  public async upsertTvList(
    username: string,
    body: {
      tvdbId: number;
      status?: $Enums.TvListStatus;
      score?: number;
      startDate?: number;
      endDate?: number;
      notes?: string;
      rewatched?: number;
      connections?: any;
    },
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaTvUserList.upsert({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId: body.tvdbId,
          },
        },
        update: {
          status: body.status,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
        create: {
          username: username.toLowerCase(),
          tvdbId: body.tvdbId,
          status: body.status,
          score: body.score,
          startDate: body.startDate,
          endDate: body.endDate,
          notes: body.notes,
          rewatched: body.rewatched,
          connections: body.connections,
        },
      });
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to update TV list',
        error: error,
      };
    }

    return {
      success: true,
      message: 'TV list updated successfully',
    };
  }

  public async deleteTvList(
    username: string,
    tvdbId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaTvUserList.delete({
        where: {
          username_tvdbId: {
            username: username.toLowerCase(),
            tvdbId,
          },
        },
      });
      return {
        success: true,
        message: 'Deleted from list',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        message: 'Failed to delete TV show from list',
        error: error,
      };
    }
  }

  public async toggleEpisodeWatched(
    username: string,
    tvdbId: number,
    seasonNum: number,
    episodeNum: number,
  ) {
    const listEntry = await this.prisma.client.aquilaTvUserList.findUnique({
      where: {
        username_tvdbId: {
          username: username.toLowerCase(),
          tvdbId,
        },
      },
    });

    if (!listEntry) throw new NotFoundException('TV show not in list');

    const existing = await this.prisma.client.aquilaTvWatchedEpisode.findUnique(
      {
        where: {
          listId_seasonNum_episodeNum: {
            listId: listEntry.id,
            seasonNum,
            episodeNum,
          },
        },
      },
    );

    if (existing) {
      await this.prisma.client.aquilaTvWatchedEpisode.delete({
        where: { id: existing.id },
      });
      return { watched: false };
    } else {
      await this.prisma.client.aquilaTvWatchedEpisode.create({
        data: {
          listId: listEntry.id,
          seasonNum,
          episodeNum,
        },
      });
      return { watched: true };
    }
  }

  public async toggleSeasonWatched(
    username: string,
    tvdbId: number,
    seasonNum: number,
    episodes: { number: number }[],
    watched: boolean,
  ) {
    const listEntry = await this.prisma.client.aquilaTvUserList.findUnique({
      where: {
        username_tvdbId: {
          username: username.toLowerCase(),
          tvdbId,
        },
      },
    });

    if (!listEntry) throw new NotFoundException('TV show not in list');

    if (watched) {
      // Mark all as watched
      for (const ep of episodes) {
        await this.prisma.client.aquilaTvWatchedEpisode.upsert({
          where: {
            listId_seasonNum_episodeNum: {
              listId: listEntry.id,
              seasonNum,
              episodeNum: ep.number,
            },
          },
          update: {},
          create: {
            listId: listEntry.id,
            seasonNum,
            episodeNum: ep.number,
          },
        });
      }
    } else {
      // Mark all as unwatched
      await this.prisma.client.aquilaTvWatchedEpisode.deleteMany({
        where: {
          listId: listEntry.id,
          seasonNum,
        },
      });
    }

    return { success: true };
  }

  public async getWatchingList(username: string): Promise<ListEntity[]> {
    const animeWatching = await this.prisma.client.aquilaAnimeUserList.findMany(
      {
        where: {
          username: username.toLowerCase(),
          status: $Enums.AnimeListStatus.WATCHING,
        },
        include: {
          anime: true,
        },
      },
    );

    const mangaReading = await this.prisma.client.aquilaMangaUserList.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.MangaListStatus.READING,
      },
      include: {
        manga: true,
      },
    });

    const tvWatching = await this.prisma.client.aquilaTvUserList.findMany({
      where: {
        username: username.toLowerCase(),
        status: $Enums.TvListStatus.WATCHING,
      },
      include: {
        tv: true,
        watchedEpisodes: true,
      },
    });

    const watchingList: ListEntity[] = [];

    animeWatching.forEach((item) => {
      watchingList.push({
        id: item.animeId,
        title:
          item.anime.titleEnglish ??
          item.anime.titleRomaji ??
          item.anime.titleNative ??
          '',
        score: item.score,
        progress: item.progress,
        episodes: item.anime.episodes,
        image: item.anime.coverImageLarge ?? '',
        format: item.anime.format ?? 'ANIME',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'anime',
      });
    });

    mangaReading.forEach((item) => {
      watchingList.push({
        id: item.mangaId,
        title: item.manga.titleEnglish ?? item.manga.titleRomaji ?? '',
        score: item.score,
        progress: item.chapters ?? 0,
        episodes: item.manga.chapters,
        image: item.manga.coverImageLarge ?? '',
        format: item.manga.format ?? 'MANGA',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'manga',
      });
    });

    tvWatching.forEach((item) => {
      const seasons = (item.tv.seasons as any[]) || [];
      const totalEpisodes = seasons.reduce(
        (acc, s) => acc + (s.episodeCount || 0),
        0,
      );

      // Find the "current" season/episode display
      // We look for the latest watched episode to show current progress
      const latestWatched = [...item.watchedEpisodes].sort((a, b) => {
        if (a.seasonNum !== b.seasonNum) return b.seasonNum - a.seasonNum;
        return b.episodeNum - a.episodeNum;
      })[0];

      watchingList.push({
        id: item.tvdbId,
        title: item.tv.titleEnglish ?? item.tv.titleRomaji ?? '',
        score: item.score,
        progress: item.watchedEpisodes.length,
        episodes: totalEpisodes,
        image: item.tv.coverImage ?? '',
        format: 'TV',
        status: item.status,
        last_updated: item.updatedAt,
        last_added: item.createdAt,
        type: 'tv',
        meta: latestWatched
          ? {
              season: latestWatched.seasonNum,
              episode: latestWatched.episodeNum,
            }
          : undefined,
      });
    });

    return watchingList.sort(
      (a, b) => b.last_updated.getTime() - a.last_updated.getTime(),
    );
  }

  public async incrementProgress(
    username: string,
    mediaType: 'anime' | 'manga' | 'tv',
    id: number,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const user = username.toLowerCase();

    if (mediaType === 'anime') {
      const entry = await this.prisma.client.aquilaAnimeUserList.findUnique({
        where: { username_animeId: { username: user, animeId: id } },
        include: { anime: true },
      });
      if (!entry) throw new NotFoundException('Anime not in list');

      const nextProgress = (entry.progress || 0) + 1;
      const isCompleted =
        entry.anime.episodes && nextProgress >= entry.anime.episodes;

      await this.prisma.client.aquilaAnimeUserList.update({
        where: { id: entry.id },
        data: {
          progress: nextProgress,
          status: isCompleted ? $Enums.AnimeListStatus.COMPLETED : entry.status,
          endDate: isCompleted ? Math.floor(Date.now() / 1000) : entry.endDate,
        },
      });
      return { success: true, message: 'Progress updated' };
    }

    if (mediaType === 'manga') {
      const entry = await this.prisma.client.aquilaMangaUserList.findUnique({
        where: { username_mangaId: { username: user, mangaId: id } },
        include: { manga: true },
      });
      if (!entry) throw new NotFoundException('Manga not in list');

      const nextProgress = (entry.chapters || 0) + 1;
      const isCompleted =
        entry.manga.chapters && nextProgress >= entry.manga.chapters;

      await this.prisma.client.aquilaMangaUserList.update({
        where: { id: entry.id },
        data: {
          chapters: nextProgress,
          status: isCompleted ? $Enums.MangaListStatus.COMPLETED : entry.status,
          endDate: isCompleted ? Math.floor(Date.now() / 1000) : entry.endDate,
        },
      });
      return { success: true, message: 'Progress updated' };
    }

    if (mediaType === 'tv') {
      const entry = await this.prisma.client.aquilaTvUserList.findUnique({
        where: { username_tvdbId: { username: user, tvdbId: id } },
        include: { tv: true, watchedEpisodes: true },
      });
      if (!entry) throw new NotFoundException('TV show not in list');

      const seasons = (entry.tv.seasons as any[]) || [];
      const totalEpisodes = seasons.reduce(
        (acc, s) => acc + (s.episodeCount || 0),
        0,
      );

      // Find the next episode to watch
      let nextEp: { seasonNum: number; episodeNum: number } | null = null;

      for (const season of seasons) {
        for (const ep of season.episodes) {
          const isWatched = entry.watchedEpisodes.some(
            (we) =>
              we.seasonNum === season.number && we.episodeNum === ep.number,
          );
          if (!isWatched) {
            nextEp = { seasonNum: season.number, episodeNum: ep.number };
            break;
          }
        }
        if (nextEp) break;
      }

      if (!nextEp) {
        return { success: false, message: 'All episodes already watched' };
      }

      await this.prisma.client.aquilaTvWatchedEpisode.create({
        data: {
          listId: entry.id,
          seasonNum: nextEp.seasonNum,
          episodeNum: nextEp.episodeNum,
        },
      });

      const totalWatched = entry.watchedEpisodes.length + 1;
      const isCompleted = totalWatched >= totalEpisodes;

      if (isCompleted) {
        await this.prisma.client.aquilaTvUserList.update({
          where: { id: entry.id },
          data: {
            status: $Enums.TvListStatus.COMPLETED,
            endDate: Math.floor(Date.now() / 1000),
          },
        });
      }

      return {
        success: true,
        message: 'Progress updated',
        data: { nextEp, isCompleted },
      };
    }

    return { success: false, message: 'Invalid media type' };
  }
}
