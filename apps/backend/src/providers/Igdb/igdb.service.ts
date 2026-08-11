import { Injectable, Logger } from '@nestjs/common';

export interface IgdbGame {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  storyline?: string;
  cover?: { id: number; url: string };
  first_release_date?: number; // Unix timestamp in seconds
  rating?: number;
  rating_count?: number;
  total_rating?: number;
  total_rating_count?: number;
  genres?: { id: number; name: string }[];
  platforms?: { id: number; name: string }[];
  involved_companies?: {
    id: number;
    company: { id: number; name: string };
    developer: boolean;
    publisher: boolean;
  }[];
  game_modes?: { id: number; name: string }[];
  player_perspectives?: { id: number; name: string }[];
  artworks?: { id: number; url: string }[];
  screenshots?: { id: number; url: string }[];
  videos?: { id: number; video_id: string; name?: string }[];
  websites?: { id: number; category: number; url: string }[];
  age_ratings?: { id: number; category: number; rating: number }[];
  franchise?: { id: number; name: string };
  franchises?: { id: number; name: string }[];
  similar_games?: { id: number; name: string; cover?: { url: string } }[];
  language_supports?: { id: number; language?: { id: number; name: string }; language_support_type?: { id: number; name: string } }[];
  external_games?: { id: number; category: number; uid: string }[];
}

@Injectable()
export class IgdbService {
  private readonly logger = new Logger(IgdbService.name);
  private readonly baseUrl = 'https://api.igdb.com/v4';
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private queue: Promise<void> = Promise.resolve();

  private getCredentials(): { clientId: string | null; clientSecret: string | null } {
    const clientId = process.env.IGDB_CLIENT_ID || process.env.TWITCH_CLIENT_ID || null;
    const clientSecret = process.env.IGDB_CLIENT_SECRET || process.env.TWITCH_CLIENT_SECRET || null;
    return { clientId, clientSecret };
  }

  private async getAccessToken(): Promise<string | null> {
    const { clientId, clientSecret } = this.getCredentials();
    if (!clientId || !clientSecret) {
      this.logger.warn('IGDB/Twitch credentials missing in environment variables');
      return null;
    }

    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    try {
      this.logger.debug('Requesting new IGDB/Twitch access token...');
      const tokenUrl = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;
      const res = await fetch(tokenUrl, { method: 'POST' });

      if (!res.ok) {
        this.logger.error(`Failed to obtain IGDB access token: ${res.statusText}`);
        return null;
      }

      const data = await res.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      return this.accessToken;
    } catch (err: any) {
      this.logger.error(`Error fetching IGDB access token: ${err?.message || err}`);
      return null;
    }
  }

  private getRequestDelayMs(): number {
    const envVal = process.env.IGDB_REQUEST_DELAY_MS;
    if (envVal) {
      const parsed = parseInt(envVal, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return 250; // IGDB allows 4 requests per second
  }

  private async execSerialized<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const next = new Promise<void>((res) => (release = res));
    const prev = this.queue;
    this.queue = next;
    await prev;
    try {
      const result = await fn();
      const delayMs = this.getRequestDelayMs();
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return result;
    } finally {
      release!();
    }
  }

  private async queryIgdb(endpoint: string, queryBody: string, maxRetries = 3): Promise<any> {
    return this.execSerialized(async () => {
      const { clientId } = this.getCredentials();
      const token = await this.getAccessToken();
      if (!clientId || !token) return null;

      const url = `${this.baseUrl}/${endpoint}`;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Client-ID': clientId,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'text/plain',
            },
            body: queryBody,
          });

          if (res.status === 429) {
            const waitMs = 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
            this.logger.warn(`IGDB rate limit hit (429). Retrying in ${waitMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
          }

          if (!res.ok) {
            this.logger.warn(`IGDB request failed (${res.status}): ${await res.text()}`);
            return null;
          }

          return await res.json();
        } catch (err: any) {
          if (attempt === maxRetries - 1) {
            this.logger.error(`IGDB fetch error for ${endpoint}: ${err?.message || err}`);
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
      return null;
    });
  }

  public formatImageUrl(
    url: string | undefined,
    size: 't_cover_big' | 't_1080p' | 't_720p' | 't_thumb' | 't_original' = 't_cover_big',
  ): string | null {
    if (!url) return null;
    let formatted = url.startsWith('//') ? `https:${url}` : url;
    formatted = formatted.replace(/\/t_[a-z0-9_]+/, `/${size}`);
    return formatted;
  }

  public async findIgdbIdByExternalId(
    externalId: string | number,
    category = 1, // 1 = Steam, 14 = GiantBomb, 26 = Epic, 28 = GOG
  ): Promise<number | null> {
    try {
      const uidStr = String(externalId).trim();
      if (!uidStr) return null;

      const body =
        category === 1
          ? `fields game; where (category = 1 & uid = "${uidStr}") | (category = 13 & uid = "${uidStr}") | url = "*steampowered.com/app/${uidStr}*"; limit 5;`
          : `fields game; where category = ${category} & uid = "${uidStr}"; limit 5;`;

      const data = await this.queryIgdb('external_games', body);

      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          if (item?.game) {
            const igdbGameId = typeof item.game === 'number' ? item.game : item.game.id;
            if (igdbGameId) {
              this.logger.debug(
                `Mapped externalId ${externalId} (cat ${category}) to IGDB ID ${igdbGameId}`,
              );
              return igdbGameId;
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to resolve IGDB ID for externalId ${externalId} (cat ${category}): ${err?.message || err}`,
      );
    }
    return null;
  }

  public async findIgdbIdByTitleOrSlug(
    title: string,
    slug?: string,
  ): Promise<number | null> {
    try {
      const cleanTitle = title.replace(/"/g, '\\"').trim();
      const cleanSlug = slug ? slug.trim().toLowerCase() : '';

      // 1. Try exact slug or exact name match first
      const exactWhereParts: string[] = [];
      if (cleanSlug) {
        exactWhereParts.push(`slug = "${cleanSlug}"`);
      }
      if (cleanTitle) {
        exactWhereParts.push(`name = "${cleanTitle}"`);
      }

      if (exactWhereParts.length > 0) {
        const body = `fields id, name, slug; where ${exactWhereParts.join(' | ')}; limit 5;`;
        const exactData = await this.queryIgdb('games', body);
        if (Array.isArray(exactData) && exactData.length > 0) {
          if (cleanSlug) {
            const matchSlug = exactData.find((g) => g.slug === cleanSlug);
            if (matchSlug) {
              this.logger.debug(
                `Found exact IGDB slug match for "${cleanSlug}": ID ${matchSlug.id}`,
              );
              return matchSlug.id;
            }
          }
          const matchName = exactData.find(
            (g) => g.name?.toLowerCase() === cleanTitle.toLowerCase(),
          );
          if (matchName) {
            this.logger.debug(
              `Found exact IGDB name match for "${cleanTitle}": ID ${matchName.id}`,
            );
            return matchName.id;
          }
          return exactData[0].id;
        }
      }

      // 2. Fallback to search query and pick closest match
      const searchRes = await this.searchGames(title, 10);
      if (searchRes.length > 0) {
        const exact = searchRes.find(
          (g) => g.name?.toLowerCase() === title.toLowerCase(),
        );
        if (exact) {
          this.logger.debug(
            `Found exact name match from search for "${title}": ID ${exact.id}`,
          );
          return exact.id;
        }
        if (cleanSlug) {
          const slugMatch = searchRes.find((g) => g.slug === cleanSlug);
          if (slugMatch) return slugMatch.id;
        }
        const containsMatch = searchRes.find((g) =>
          g.name?.toLowerCase().includes(title.toLowerCase()),
        );
        if (containsMatch) return containsMatch.id;

        return searchRes[0].id;
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to resolve IGDB ID by title/slug for "${title}": ${err?.message || err}`,
      );
    }
    return null;
  }

  public async searchGames(query: string, limit = 20): Promise<IgdbGame[]> {
    const clean = query.replace(/"/g, '\\"').trim();
    if (!clean) return [];

    const body = `search "${clean}"; fields id, name, slug, summary, storyline, cover.url, first_release_date, total_rating, total_rating_count, rating, rating_count, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, game_modes.name, player_perspectives.name, artworks.url, screenshots.url, videos.video_id, videos.name, websites.url, websites.category, age_ratings.category, age_ratings.rating, language_supports.language.name; limit ${limit};`;

    const data = await this.queryIgdb('games', body);
    return Array.isArray(data) ? data : [];
  }

  public async fetchGameDetail(igdbId: number): Promise<IgdbGame | null> {
    const body = `where id = ${igdbId}; fields id, name, slug, summary, storyline, cover.url, first_release_date, total_rating, total_rating_count, rating, rating_count, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, game_modes.name, player_perspectives.name, artworks.url, screenshots.url, videos.video_id, videos.name, websites.url, websites.category, age_ratings.category, age_ratings.rating, franchise.name, franchises.name, similar_games.id, similar_games.name, similar_games.cover.url, language_supports.language.name, external_games.category, external_games.uid;`;

    const data = await this.queryIgdb('games', body);
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    return null;
  }
}
