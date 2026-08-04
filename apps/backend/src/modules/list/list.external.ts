import { Injectable, Logger } from '@nestjs/common';
import { ConnectionService } from '../connection/connection.service';
import {
  AnimeUpdateData,
  MangaUpdateData,
  MovieUpdateData,
  TvUpdateData,
  ConnectionCapability,
} from '@runa/connections';

@Injectable()
export class ListExternal {
  private readonly logger = new Logger(ListExternal.name);

  constructor(private readonly connectionService: ConnectionService) {}

  public async syncAnime(
    providerKey: string,
    username: string,
    providerId: number,
    data: AnimeUpdateData,
  ): Promise<void> {
    try {
      const provider =
        this.connectionService.getConnectionInstance(providerKey);

      // Enforce capability tag check
      if (!provider.capabilities.includes(ConnectionCapability.ANIME)) {
        this.logger.warn(
          `Provider '${providerKey}' does not support anime synchronization`,
        );
        return;
      }

      if (provider.updateAnimeEntry) {
        await provider.updateAnimeEntry(username, providerId, data);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to sync anime for provider '${providerKey}': ${err.message}`,
      );
    }
  }

  public async syncManga(
    providerKey: string,
    username: string,
    providerId: number,
    data: MangaUpdateData,
  ): Promise<void> {
    try {
      const provider =
        this.connectionService.getConnectionInstance(providerKey);

      // Enforce capability tag check
      if (!provider.capabilities.includes(ConnectionCapability.MANGA)) {
        this.logger.warn(
          `Provider '${providerKey}' does not support manga synchronization`,
        );
        return;
      }

      if (provider.updateMangaEntry) {
        await provider.updateMangaEntry(username, providerId, data);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to sync manga for provider '${providerKey}': ${err.message}`,
      );
    }
  }

  public async syncMovie(
    providerKey: string,
    username: string,
    providerId: number,
    data: MovieUpdateData,
  ): Promise<void> {
    try {
      const provider =
        this.connectionService.getConnectionInstance(providerKey);

      // Enforce capability tag check
      if (!provider.capabilities.includes(ConnectionCapability.MOVIES)) {
        this.logger.warn(
          `Provider '${providerKey}' does not support movie synchronization`,
        );
        return;
      }

      if (provider.updateMovieEntry) {
        await provider.updateMovieEntry(username, providerId, data);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to sync movie for provider '${providerKey}': ${err.message}`,
      );
    }
  }

  public async syncTv(
    providerKey: string,
    username: string,
    providerId: number,
    data: TvUpdateData,
  ): Promise<void> {
    try {
      const provider =
        this.connectionService.getConnectionInstance(providerKey);

      // Enforce capability tag check
      if (!provider.capabilities.includes(ConnectionCapability.TV_SHOWS)) {
        this.logger.warn(
          `Provider '${providerKey}' does not support TV show synchronization`,
        );
        return;
      }

      if (provider.updateTvEntry) {
        await provider.updateTvEntry(username, providerId, data);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to sync TV show for provider '${providerKey}': ${err.message}`,
      );
    }
  }

  public async deleteAnime(
    providerKey: string,
    username: string,
    providerId: number,
  ): Promise<void> {
    try {
      const provider =
        this.connectionService.getConnectionInstance(providerKey);

      if (!provider.capabilities.includes(ConnectionCapability.ANIME)) {
        this.logger.warn(
          `Provider '${providerKey}' does not support anime synchronization`,
        );
        return;
      }
      if (provider.deleteAnimeEntry) {
        await provider.deleteAnimeEntry(username, providerId);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to delete anime for provider '${providerKey}': ${err.message}`,
      );
    }
  }

  public async deleteManga(
    providerKey: string,
    username: string,
    providerId: number,
  ): Promise<void> {
    try {
      const provider =
        this.connectionService.getConnectionInstance(providerKey);

      if (!provider.capabilities.includes(ConnectionCapability.MANGA)) {
        this.logger.warn(
          `Provider '${providerKey}' does not support manga synchronization`,
        );
        return;
      }

      if (provider.deleteMangaEntry) {
        await provider.deleteMangaEntry(username, providerId);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to delete manga for provider '${providerKey}': ${err.message}`,
      );
    }
  }

  public async deleteMovie(
    providerKey: string,
    username: string,
    providerId: number,
  ): Promise<void> {
    try {
      const provider =
        this.connectionService.getConnectionInstance(providerKey);

      if (!provider.capabilities.includes(ConnectionCapability.MOVIES)) {
        this.logger.warn(
          `Provider '${providerKey}' does not support movie synchronization`,
        );
        return;
      }

      if (provider.deleteMovieEntry) {
        await provider.deleteMovieEntry(username, providerId);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to delete movie for provider '${providerKey}': ${err.message}`,
      );
    }
  }

  public async deleteTv(
    providerKey: string,
    username: string,
    providerId: number,
  ): Promise<void> {
    try {
      const provider =
        this.connectionService.getConnectionInstance(providerKey);

      if (!provider.capabilities.includes(ConnectionCapability.TV_SHOWS)) {
        this.logger.warn(
          `Provider '${providerKey}' does not support TV show synchronization`,
        );
        return;
      }

      if (provider.deleteTvEntry) {
        await provider.deleteTvEntry(username, providerId);
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to delete TV show for provider '${providerKey}': ${err.message}`,
      );
    }
  }
}
