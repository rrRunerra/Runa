import { Injectable, Logger } from '@nestjs/common';

export interface SteamAppDetails {
  short_description?: string;
  website?: string;
  supported_languages?: string;
  required_age?: string | number;
  metacritic?: { score: number };
  movies?: { name: string; thumbnail: string; mp4?: { max: string }; webm?: { max: string } }[];
}

export interface SteamAppReviews {
  total_reviews: number;
  total_positive: number;
  total_negative: number;
  review_score_desc: string;
}

@Injectable()
export class SteamService {
  private readonly logger = new Logger(SteamService.name);

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
            `Steam rate limit hit (429) for ${url}. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        return res;
      } catch (err: any) {
        if (attempt === maxRetries - 1) {
          this.logger.warn(`Steam fetch failed for ${url}: ${err.message}`);
          return null;
        }
        const waitMs = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    return null;
  }

  public async fetchAppDetails(steamAppId: number): Promise<SteamAppDetails | null> {
    try {
      const url = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}`;
      const res = await this.fetchWithRateLimit(url);
      if (!res || !res.ok) return null;

      const data = await res.json();
      if (data && data[steamAppId] && data[steamAppId].success) {
        return data[steamAppId].data as SteamAppDetails;
      }
    } catch (err: any) {
      this.logger.warn(`Steam app details fetch failed for ${steamAppId}: ${err.message}`);
    }
    return null;
  }

  public async fetchAppReviews(steamAppId: number): Promise<SteamAppReviews | null> {
    try {
      const url = `https://store.steampowered.com/appreviews/${steamAppId}?json=1&language=all`;
      const res = await this.fetchWithRateLimit(url);
      if (!res || !res.ok) return null;

      const data = await res.json();
      if (data && data.query_summary) {
        return data.query_summary as SteamAppReviews;
      }
    } catch (err: any) {
      this.logger.warn(`Steam app reviews fetch failed for ${steamAppId}: ${err.message}`);
    }
    return null;
  }
}
