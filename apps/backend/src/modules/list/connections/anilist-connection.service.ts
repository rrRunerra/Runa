import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../providers/database/prisma.service';
import { IConnectionProvider, AnimeUpdateData, MangaUpdateData } from './connection-provider.interface';

@Injectable()
export class AnilistConnectionService implements IConnectionProvider {
  public readonly providerKey = 'anilist';
  private readonly logger = new Logger(AnilistConnectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async updateAnimeEntry(
    username: string,
    providerId: number,
    data: AnimeUpdateData,
  ): Promise<void> {
    const anilistConnection = await this.prisma.client.connections.findFirst({
      where: {
        username: username,
        provider: 'ANILIST',
      },
      select: {
        accessToken: true,
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
            }
          }
        `,
        variables: {
          mediaId: providerId,
          status: data.status === 'WATCHING' ? 'CURRENT' : data.status,
          progress: data.progress,
          score: data.score,
          startedAt: data.startDate
            ? {
                year: new Date(data.startDate * 1000).getFullYear(),
                month: new Date(data.startDate * 1000).getMonth() + 1,
                day: new Date(data.startDate * 1000).getDate(),
              }
            : undefined,
          completedAt: data.endDate
            ? {
                year: new Date(data.endDate * 1000).getFullYear(),
                month: new Date(data.endDate * 1000).getMonth() + 1,
                day: new Date(data.endDate * 1000).getDate(),
              }
            : undefined,
          notes: data.notes,
          repeat: data.rewatched,
        },
      }),
    });

    if (!res.ok) {
      this.logger.error(`Failed to update Anilist connection for user ${username}`);
      return;
    }

    const resData = await res.json();
    if (resData.errors) {
      this.logger.error(`Failed to update Anilist connection for user ${username}: ${JSON.stringify(resData.errors)}`);
      return;
    }

    this.logger.log(`Anilist connection updated for user ${username}`);
  }

  public async updateMangaEntry(
    username: string,
    providerId: number,
    data: MangaUpdateData,
  ): Promise<void> {
    const anilistConnection = await this.prisma.client.connections.findFirst({
      where: { username, provider: 'ANILIST' },
      select: { accessToken: true },
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
            }
          }
        `,
        variables: {
          mediaId: providerId,
          status: data.status === 'READING' ? 'CURRENT' : data.status,
          progress: data.chapters,
          progressVolumes: data.volumes,
          score: data.score,
          startedAt: data.startDate
            ? {
                year: new Date(data.startDate * 1000).getFullYear(),
                month: new Date(data.startDate * 1000).getMonth() + 1,
                day: new Date(data.startDate * 1000).getDate(),
              }
            : undefined,
          completedAt: data.endDate
            ? {
                year: new Date(data.endDate * 1000).getFullYear(),
                month: new Date(data.endDate * 1000).getMonth() + 1,
                day: new Date(data.endDate * 1000).getDate(),
              }
            : undefined,
          notes: data.notes,
          repeat: data.reread,
        },
      }),
    });

    if (!res.ok) {
      this.logger.error(`Failed to update Anilist manga connection for user ${username}`);
      return;
    }

    const resData = await res.json();
    if (resData.errors) {
      this.logger.error(`Failed to update Anilist manga connection for user ${username}: ${JSON.stringify(resData.errors)}`);
      return;
    }

    this.logger.log(`Anilist manga connection updated for user ${username}`);
  }
}
