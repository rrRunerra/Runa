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
      `anime-search:${name.replace(/\+/g, ' ').trim().toLowerCase().replaceAll(' ', '')}`,
    animeDetail: (id: number) => `anime:${id}`,
    animeRefreshCooldown: (id: number) => `cooldown:refresh:anime:${id}`,

    // Search Refresh Cooldown (1 hour per media type + query)
    searchRefreshCooldown: (mediaType: string, name: string) =>
      `cooldown:search-refresh:${mediaType}:${name.replace(/\+/g, ' ').trim().toLowerCase().replaceAll(' ', '')}`,

    // TV
    tvSearch: (name: string) =>
      `tv-search:${name.replace(/\+/g, ' ').trim().toLowerCase().replaceAll(' ', '')}`,
    tvDetail: (id: number) => `tv:${id}`,
    tvRefreshCooldown: (id: number) => `cooldown:refresh:tv:${id}`,

    // Movie
    movieSearch: (name: string) =>
      `movie-search:${name.replace(/\+/g, ' ').trim().toLowerCase().replaceAll(' ', '')}`,
    movieDetail: (id: number) => `movie:${id}`,
    movieRefreshCooldown: (id: number) => `cooldown:refresh:movie:${id}`,

    // Manga
    mangaSearch: (name: string) =>
      `manga-search:${name.replace(/\+/g, ' ').trim().toLowerCase().replaceAll(' ', '')}`,
    mangaDetail: (id: number) => `manga:${id}`,
    mangaRefreshCooldown: (id: number) => `cooldown:refresh:manga:${id}`,

    // Game
    gameSearch: (name: string) =>
      `game-search:${name.replace(/\+/g, ' ').trim().toLowerCase().replaceAll(' ', '')}`,
    gameDetail: (id: number) => `game:${id}`,
    gameRefreshCooldown: (id: number) => `cooldown:refresh:game:${id}`,

    // Book
    bookSearch: (name: string) =>
      `book-search:${name.replace(/\+/g, ' ').trim().toLowerCase().replaceAll(' ', '')}`,
    bookDetail: (id: string) => `book:${id}`,
    bookRefreshCooldown: (id: string) => `cooldown:refresh:book:${id}`,

    // Character
    characterSearch: (name: string) =>
      `character-search:${name.replace(/\+/g, ' ').trim().toLowerCase().replaceAll(' ', '')}`,
    characterDetail: (id: number) => `character:${id}`,

    // Actor
    actorSearch: (name: string) =>
      `actor-search:${name.replace(/\+/g, ' ').trim().toLowerCase().replaceAll(' ', '')}`,
    actorDetail: (id: number) => `actor:${id}`,

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

    // Discover
    discoverMeta: (mediaType: string) => `discover-meta:${mediaType.toLowerCase()}`,
    discoverList: (
      mediaType: string,
      page: number | string,
      limit: number | string,
      year: number | string,
      format: string,
      status: string,
      search: string,
      sort: string,
      addedWithin: string,
    ) =>
      `discover:${mediaType.toLowerCase()}:${page}:${limit}:${year}:${format}:${status}:${search}:${sort}:${addedWithin}`,

    // Recommendations
    recommendations: (
      mediaType: string,
      mediaId: number | string,
      cursor?: string,
      take?: number,
      sort?: string,
    ) =>
      `recommendations:${mediaType.toLowerCase()}:${mediaId}:${cursor || 'start'}:${take || 10}:${sort || 'score'}`,

    // Rankings
    rankingsMeta: (mediaType: string) => `rankings-meta:${mediaType.toLowerCase()}`,
    rankingsList: (
      mediaType: string,
      source: string,
      genres: string,
      year: number | string,
      season: string,
      format: string,
      status: string,
      limit: number | string,
      page: number | string,
    ) =>
      `rankings:${mediaType.toLowerCase()}:${source}:${genres}:${year}:${season}:${format}:${status}:${limit}:${page}`,
  };
}
