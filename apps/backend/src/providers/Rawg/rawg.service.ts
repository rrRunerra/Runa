import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RawgService {
  private readonly logger = new Logger(RawgService.name);
  private readonly baseUrl = 'https://api.rawg.io/api';

  private getApiKey(): string | null {
    return process.env.RAWG_API_KEY || null;
  }

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
            `RAWG rate limit hit (429) for ${url}. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        return res;
      } catch (err: any) {
        if (attempt === maxRetries - 1) {
          this.logger.warn(`RAWG fetch failed for ${url}: ${err.message}`);
          return null;
        }
        const waitMs = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    return null;
  }

  public async searchGames(query: string): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const url = `${this.baseUrl}/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=20`;
    const res = await this.fetchWithRateLimit(url);
    if (res && res.ok) {
      return res.json();
    }
    return null;
  }

  public async fetchGameDetail(rawgId: number): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const url = `${this.baseUrl}/games/${rawgId}?key=${apiKey}`;
    const res = await this.fetchWithRateLimit(url);
    if (res && res.ok) {
      return res.json();
    }
    return null;
  }

  public async fetchGameScreenshots(rawgId: number): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const url = `${this.baseUrl}/games/${rawgId}/screenshots?key=${apiKey}`;
    const res = await this.fetchWithRateLimit(url);
    if (res && res.ok) {
      return res.json();
    }
    return null;
  }

  public async fetchGameDevTeam(rawgId: number): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const url = `${this.baseUrl}/games/${rawgId}/development-team?key=${apiKey}`;
    const res = await this.fetchWithRateLimit(url);
    if (res && res.ok) {
      return res.json();
    }
    return null;
  }

  public async fetchGameStores(rawgId: number): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const url = `${this.baseUrl}/games/${rawgId}/stores?key=${apiKey}`;
    const res = await this.fetchWithRateLimit(url);
    if (res && res.ok) {
      return res.json();
    }
    return null;
  }

  public async fetchGameMovies(rawgId: number): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const url = `${this.baseUrl}/games/${rawgId}/movies?key=${apiKey}`;
    const res = await this.fetchWithRateLimit(url);
    if (res && res.ok) {
      return res.json();
    }
    return null;
  }

  public async fetchGameSeries(rawgId: number): Promise<any> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const url = `${this.baseUrl}/games/${rawgId}/game-series?key=${apiKey}`;
    const res = await this.fetchWithRateLimit(url);
    if (res && res.ok) {
      return res.json();
    }
    return null;
  }
}
