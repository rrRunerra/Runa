import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../providers/database/prisma.service';
import { IConnectionProvider, AnimeUpdateData, MangaUpdateData } from './connection-provider.interface';

@Injectable()
export class MalConnectionService implements IConnectionProvider {
  public readonly providerKey = 'mal';
  private readonly logger = new Logger(MalConnectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async updateAnimeEntry(
    username: string,
    providerId: number,
    data: AnimeUpdateData,
  ): Promise<void> {
    if (Number.isNaN(providerId) || providerId < 0) {
      this.logger.error(`MAL ID is invalid`);
      return;
    }

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
        return;
      }
    }

    let malStatusMapped: string | undefined = undefined;
    switch (data.status) {
      case 'WATCHING':
        malStatusMapped = 'watching';
        break;
      case 'COMPLETED':
        malStatusMapped = 'completed';
        break;
      case 'PAUSED':
        malStatusMapped = 'on_hold';
        break;
      case 'DROPPED':
        malStatusMapped = 'dropped';
        break;
      case 'PLANNING':
        malStatusMapped = 'plan_to_watch';
        break;
      case 'REPEATING':
        malStatusMapped = 'watching';
        break;
    }

    const malData = new URLSearchParams();
    if (malStatusMapped) malData.append('status', malStatusMapped);
    if (data.score !== undefined)
      malData.append('score', Math.round(data.score).toString());
    if (data.progress !== undefined)
      malData.append('num_watched_episodes', data.progress.toString());
    if (data.status === 'REPEATING') malData.append('is_rewatching', 'true');
    if (data.rewatched !== undefined)
      malData.append('num_times_rewatched', data.rewatched.toString());
    if (data.notes !== undefined) malData.append('comments', data.notes);

    const parseDateStr = (ts?: number) => {
      if (!ts) return undefined;
      const d = new Date(ts * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    if (data.startDate) {
      const startString = parseDateStr(data.startDate);
      if (startString) malData.append('start_date', startString);
    }
    if (data.endDate) {
      const endString = parseDateStr(data.endDate);
      if (endString) malData.append('finish_date', endString);
    }

    const res = await fetch(
      `https://api.myanimelist.net/v2/anime/${providerId}/my_list_status`,
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
      this.logger.error(`Failed to update MAL connection for user ${username}`);
    } else {
      this.logger.log(`MAL connection updated for user ${username}`);
    }
  }

  public async updateMangaEntry(
    username: string,
    providerId: number,
    data: MangaUpdateData,
  ): Promise<void> {
    if (Number.isNaN(providerId) || providerId < 0) {
      this.logger.error(`MAL manga ID is invalid`);
      return;
    }

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
        return;
      }
    }

    let malStatusMapped: string | undefined = undefined;
    switch (data.status) {
      case 'READING':
        malStatusMapped = 'reading';
        break;
      case 'COMPLETED':
        malStatusMapped = 'completed';
        break;
      case 'ON_HOLD':
        malStatusMapped = 'on_hold';
        break;
      case 'DROPPED':
        malStatusMapped = 'dropped';
        break;
      case 'PLANNING':
        malStatusMapped = 'plan_to_read';
        break;
    }

    const malData = new URLSearchParams();
    if (malStatusMapped) malData.append('status', malStatusMapped);
    if (data.score !== undefined)
      malData.append('score', Math.round(data.score).toString());
    if (data.chapters !== undefined)
      malData.append('num_chapters_read', data.chapters.toString());
    if (data.volumes !== undefined)
      malData.append('num_volumes_read', data.volumes.toString());
    if (data.reread !== undefined)
      malData.append('num_times_reread', data.reread.toString());
    if (data.notes !== undefined) malData.append('comments', data.notes);

    const parseDateStr = (ts?: number) => {
      if (!ts) return undefined;
      const d = new Date(ts * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    if (data.startDate) {
      const startString = parseDateStr(data.startDate);
      if (startString) malData.append('start_date', startString);
    }
    if (data.endDate) {
      const endString = parseDateStr(data.endDate);
      if (endString) malData.append('finish_date', endString);
    }

    const res = await fetch(
      `https://api.myanimelist.net/v2/manga/${providerId}/my_list_status`,
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
      this.logger.error(`Failed to update MAL manga connection for user ${username}`);
    } else {
      this.logger.log(`MAL manga connection updated for user ${username}`);
    }
  }
}
