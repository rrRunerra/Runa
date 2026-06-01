import { Injectable, Logger } from '@nestjs/common';

import { AnilistConnectionService } from './anilist-connection.service';
import { MalConnectionService } from './mal-connection.service';
import { IConnectionProvider, AnimeUpdateData, MangaUpdateData } from './connection-provider.interface';


@Injectable()
export class ConnectionsManager {
  private readonly providers = new Map<string, IConnectionProvider>();
  private readonly logger = new Logger(ConnectionsManager.name);

  constructor(
    private readonly anilist: AnilistConnectionService,
    private readonly mal: MalConnectionService,
  ) {
    this.register(this.anilist);
    this.register(this.mal);
  }

  public register(provider: IConnectionProvider) {
    this.providers.set(provider.providerKey.toLowerCase(), provider);
  }

  public async syncAnime(
    providerKey: string,
    username: string,
    providerId: number,
    data: AnimeUpdateData,
  ): Promise<void> {
    const provider = this.providers.get(providerKey.toLowerCase());
    if (!provider) {
      this.logger.error(`Provider '${providerKey}' is not registered`);
      return;
    }
    await provider.updateAnimeEntry(username, providerId, data);
  }

  public async syncManga(
    providerKey: string,
    username: string,
    providerId: number,
    data: MangaUpdateData,
  ): Promise<void> {
    const provider = this.providers.get(providerKey.toLowerCase());
    if (!provider) {
      this.logger.error(`Provider '${providerKey}' is not registered`);
      return;
    }
    await provider.updateMangaEntry(username, providerId, data);
  }
}
