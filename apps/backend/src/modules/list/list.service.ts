import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import ListEntity from './entities/ListEntity';
import { $Enums } from '@runa/database';

@Injectable()
export class ListService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(ListService.name);

  public async getAnimeList(userId: string): Promise<ListEntity[]> {
    const list = await this.prisma.client.aquilaAnimeUserList.findMany({
      where: {
        userId: userId,
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
      };
    });

    return mappedList;
  }

  public async getAnimeListEntry(userId: string, animeId: number) {
    return this.prisma.client.aquilaAnimeUserList.findUnique({
      where: {
        userId_animeId: {
          userId,
          animeId,
        },
      },
    });
  }

  public async upsertAnimeList(body: {
    userId: string;
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
  }): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaAnimeUserList.upsert({
        where: {
          userId_animeId: {
            userId: body.userId,
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
          userId: body.userId,
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
          body.userId,
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
    userId: string,
    animeId: number,
  ): Promise<{ success: boolean; message: string; error?: any }> {
    try {
      await this.prisma.client.aquilaAnimeUserList.delete({
        where: {
          userId_animeId: {
            userId,
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
    userId: string,
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
          userId: userId,
          provider: 'ANILIST',
        },
        select: {
          accessToken: true,
          refreshToken: true,
          expiresAt: true,
        },
      });

      if (!anilistConnection) {
        this.logger.warn(`No Anilist connection found for user ${userId}`);
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
          `Failed to update Anilist connection for user ${userId}`,
        );
        return;
      }

      const data = await res.json();
      if (data.errors) {
        this.logger.error(
          `Failed to update Anilist connection for user ${userId}`,
        );
        return;
      }

      this.logger.log(`Anilist connection updated for user ${userId}`);
    }

    if (connections.mal) {
      const malConnection = await this.prisma.client.connections.findFirst({
        where: {
          userId: userId,
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
        this.logger.warn(`No MAL connection found for user ${userId}`);
        return;
      }

      let accessToken = malConnection.accessToken;

      // Refresh MAL token if expired
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
          this.logger.log(`MAL token refreshed for user ${userId}`);
        } else {
          this.logger.error(`Failed to refresh MAL token for user ${userId}`);
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
        this.logger.error(`Failed to update MAL connection for user ${userId}`);
      } else {
        this.logger.log(`MAL connection updated for user ${userId}`);
      }
    }
  }
}
