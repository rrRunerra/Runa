import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createCacheClient, Cache } from '@runa/cache';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly client: Cache = createCacheClient();

  async get<T>(key: string): Promise<T | null> {
    return this.client.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.client.set<T>(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    return this.client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.disconnect) {
      await this.client.disconnect();
    }
  }

  public static readonly keys = {
    // Anime
    animeSearch: (name: string) =>
      `anime-search:${name.trim().toLowerCase().replaceAll(' ', '')}`,
    animeDetail: (id: number) => `anime:${id}`,
    animeRefreshCooldown: (id: number) => `cooldown:refresh:anime:${id}`,

    // TV
    tvSearch: (name: string) =>
      `tv-search:${name.trim().toLowerCase().replaceAll(' ', '')}`,
    tvDetail: (id: number) => `tv:${id}`,
    tvRefreshCooldown: (id: number) => `cooldown:refresh:tv:${id}`,

    // Movie
    movieSearch: (name: string) =>
      `movie-search:${name.trim().toLowerCase().replaceAll(' ', '')}`,
    movieDetail: (id: number) => `movie:${id}`,
    movieRefreshCooldown: (id: number) => `cooldown:refresh:movie:${id}`,

    // Manga
    mangaSearch: (name: string) =>
      `manga-search:${name.trim().toLowerCase().replaceAll(' ', '')}`,
    mangaDetail: (id: number) => `manga:${id}`,
    mangaRefreshCooldown: (id: number) => `cooldown:refresh:manga:${id}`,

    // Game
    gameSearch: (name: string) =>
      `game-search:${name.trim().toLowerCase().replaceAll(' ', '')}`,
    gameDetail: (id: number) => `game:${id}`,
    gameRefreshCooldown: (id: number) => `cooldown:refresh:game:${id}`,

    // Book
    bookSearch: (name: string) =>
      `book-search:${name.trim().toLowerCase().replaceAll(' ', '')}`,
    bookDetail: (id: string) => `book:${id}`,
    bookRefreshCooldown: (id: string) => `cooldown:refresh:book:${id}`,

    // Email
    emailRefreshCooldown: (id: string) =>
      `cooldown:refresh:email-account:${id}`,
    emailAutoconfig: (domain: string) =>
      `email:autoconfig:${domain.trim().toLowerCase()}`,

    // Bookmarks
    bookmarksUser: (userId: string) => `bookmarks:user:${userId}`,

    // User Lists (all media types)
    listMedia: (mediaType: string, username: string) =>
      `list:${mediaType}:user:${username.trim().toLowerCase()}`,
    listMediaEntry: (
      mediaType: string,
      username: string,
      mediaId: number | string,
    ) =>
      `list:${mediaType}:entry:user:${username.trim().toLowerCase()}:${mediaId}`,
  };
}
