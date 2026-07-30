import { Injectable, Logger } from '@nestjs/common';

export interface TvdbData {
  tvdbId: number;
  posters: string[];
  banners: string[];
  backgrounds: string[];
  companies: { tvdbId: number; name: string }[];
}

@Injectable()
export class TvdbService {
  private readonly logger = new Logger(TvdbService.name);

  private async fetchWithRateLimit(
    url: string,
    options?: RequestInit,
    maxRetries = 3,
    baseDelay = 1000,
  ): Promise<Response | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(url, options);

        if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after');
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000 + 500
            : baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
          this.logger.warn(
            `TVDB rate limit hit (429) for ${url}. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        return res;
      } catch (err: any) {
        if (attempt === maxRetries - 1) {
          this.logger.warn(`TVDB fetch failed for ${url}: ${err.message}`);
          return null;
        }
        const waitMs = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    return null;
  }

  public async fetchTvdbData(
    tvdbIdParam: number | null,
    animeTitle: string,
  ): Promise<TvdbData | null> {
    const apiKey = process.env.THETVDB_KEY;
    if (!apiKey) return null;

    try {
      const loginRes = await this.fetchWithRateLimit('https://api4.thetvdb.com/v4/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apikey: apiKey }),
      });

      if (!loginRes || !loginRes.ok) return null;
      const loginJson = await loginRes.json();
      const token = loginJson?.data?.token;
      if (!token) return null;

      let seriesId = tvdbIdParam;
      if (!seriesId && animeTitle) {
        const searchUrl = `https://api4.thetvdb.com/v4/search?q=${encodeURIComponent(
          animeTitle,
        )}&type=series`;
        const searchRes = await this.fetchWithRateLimit(searchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (searchRes && searchRes.ok) {
          const searchJson = await searchRes.json();
          seriesId = searchJson?.data?.[0]?.tvdb_id
            ? Number(searchJson.data[0].tvdb_id)
            : null;
        }
      }

      if (!seriesId) return null;

      const extendedUrl = `https://api4.thetvdb.com/v4/series/${seriesId}/extended`;
      const extendedRes = await this.fetchWithRateLimit(extendedUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!extendedRes || !extendedRes.ok) return null;
      const extendedJson = await extendedRes.json();

      const formatTvdbUrl = (img?: string): string | null => {
        if (!img) return null;
        if (img.startsWith('http')) return img;
        return `https://artworks.thetvdb.com/${img.replace(/^\//, '')}`;
      };

      const artworks = extendedJson?.data?.artworks || [];
      const posters = artworks
        .filter((a: any) => a.type === 2 || a.type === 7)
        .map((a: any) => formatTvdbUrl(a.image))
        .filter(Boolean) as string[];
      const banners = artworks
        .filter((a: any) => a.type === 1)
        .map((a: any) => formatTvdbUrl(a.image))
        .filter(Boolean) as string[];
      const backgrounds = artworks
        .filter((a: any) => a.type === 3)
        .map((a: any) => formatTvdbUrl(a.image))
        .filter(Boolean) as string[];

      const companies = (
        extendedJson?.data?.companies ||
        extendedJson?.data?.production_companies ||
        []
      ).map((c: any) => ({ tvdbId: c.id, name: c.name }));

      return {
        tvdbId: seriesId,
        posters,
        banners,
        backgrounds,
        companies,
      };
    } catch (err: any) {
      this.logger.warn(`TVDB API v4 error: ${err.message}`);
      return null;
    }
  }
}
