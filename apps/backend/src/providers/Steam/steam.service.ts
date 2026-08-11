import { Injectable, Logger } from '@nestjs/common';

export interface SteamAppDetails {
  type?: string;
  fullgame?: { appid?: string | number; name?: string };
  short_description?: string;
  website?: string;
  supported_languages?: string;
  required_age?: string | number;
  pc_requirements?: any;
  mac_requirements?: any;
  linux_requirements?: any;
  controller_support?: string;
  achievements?: { total?: number; highlighted?: Array<{ name: string; path?: string }> };
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

  public async fetchAllAchievements(
    steamAppId: number,
  ): Promise<{ name: string; description?: string; path?: string; hidden?: boolean }[]> {
    try {
      // 1. Try Steam Web API if key is present
      const apiKey = process.env.STEAM_API_KEY;
      if (apiKey) {
        try {
          const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${steamAppId}`;
          const schemaRes = await this.fetchWithRateLimit(schemaUrl);
          if (schemaRes && schemaRes.ok) {
            const schemaData = await schemaRes.json();
            const achList = schemaData?.game?.availableGameStats?.achievements;
            if (Array.isArray(achList) && achList.length > 0) {
              const parsed = achList.map((a: any) => ({
                name: a.displayName || a.name || '',
                description: a.description || '',
                path: a.icon || a.icongray || '',
                hidden: Boolean(a.hidden === 1 || a.hidden === '1' || a.hidden === true),
              }));
              this.logger.debug(
                `Fetched ${parsed.length} achievements via Steam Web API for app ${steamAppId}`,
              );
              return parsed;
            }
          }
        } catch {
          // fallback to community XML/HTML
        }
      }

      // 2. Try Steam Community XML
      let achievements = await this.fetchCommunityXmlAchievements(steamAppId);

      // 3. Fallback to Steam Community HTML if XML returned 0 achievements
      if (achievements.length === 0) {
        achievements = await this.fetchCommunityHtmlAchievements(steamAppId);
      }

      this.logger.debug(
        `Fetched ${achievements.length} total achievements for steamAppId ${steamAppId}`,
      );
      return achievements;
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch all achievements for steamAppId ${steamAppId}: ${err?.message || err}`,
      );
      return [];
    }
  }

  private async fetchCommunityXmlAchievements(
    steamAppId: number,
  ): Promise<{ name: string; description?: string; path?: string; hidden?: boolean }[]> {
    try {
      const url = `https://steamcommunity.com/stats/${steamAppId}/achievements?xml=1&l=english`;
      this.logger.debug(`Fetching Community XML for steamAppId ${steamAppId}: ${url}`);
      const res = await this.fetchWithRateLimit(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie:
            'wants_mature_content=1; birthtime=-631152000; lastagecheckage=1-January-1990; desiresized=1; mat_reset=1',
        },
      });

      if (!res || !res.ok) {
        this.logger.debug(`Community XML request failed with status: ${res?.status}`);
        return [];
      }

      const xmlText = await res.text();
      this.logger.debug(`Community XML received payload length: ${xmlText.length} chars`);
      const achievements: {
        name: string;
        description?: string;
        path?: string;
        hidden?: boolean;
      }[] = [];

      const achRegex = /<achievement\b([^>]*)>([\s\S]*?)<\/achievement>/gi;
      let match: RegExpExecArray | null;

      while ((match = achRegex.exec(xmlText)) !== null) {
        const attrStr = match[1] || '';
        const block = match[2];

        const nameMatch = /<name>([\s\S]*?)<\/name>/i.exec(block);
        const descMatch = /<description>([\s\S]*?)<\/description>/i.exec(block);
        const iconMatch =
          /<iconClosed>([\s\S]*?)<\/iconClosed>/i.exec(block) ||
          /<iconOpen>([\s\S]*?)<\/iconOpen>/i.exec(block);
        const hiddenMatch =
          /<hidden>([1-9]|true)<\/hidden>/i.exec(block) ||
          /suppressDescription="1"/i.test(attrStr) ||
          /hidden="1"/i.test(attrStr);

        const cleanStr = (str?: string) =>
          str ? str.replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';

        const name = cleanStr(nameMatch?.[1]);
        const description = cleanStr(descMatch?.[1]);
        const path = cleanStr(iconMatch?.[1]);
        const hidden = Boolean(hiddenMatch);

        if (name) {
          achievements.push({ name, description, path, hidden });
        }
      }

      this.logger.debug(
        `Parsed ${achievements.length} achievements via Community XML for steamAppId ${steamAppId}`,
      );
      return achievements;
    } catch (err: any) {
      this.logger.warn(`Community XML parsing error for ${steamAppId}: ${err?.message || err}`);
      return [];
    }
  }

  private async fetchCommunityHtmlAchievements(
    steamAppId: number,
  ): Promise<{ name: string; description?: string; path?: string; hidden?: boolean }[]> {
    try {
      const url = `https://steamcommunity.com/stats/${steamAppId}/achievements?l=english`;
      this.logger.debug(`Fetching Community HTML fallback for steamAppId ${steamAppId}: ${url}`);
      const res = await this.fetchWithRateLimit(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie:
            'wants_mature_content=1; birthtime=-631152000; lastagecheckage=1-January-1990; desiresized=1; mat_reset=1',
        },
      });

      if (!res || !res.ok) {
        this.logger.debug(`Community HTML request failed with status: ${res?.status}`);
        return [];
      }

      const html = await res.text();
      this.logger.debug(`Community HTML received payload length: ${html.length} chars`);
      const achievements: {
        name: string;
        description?: string;
        path?: string;
        hidden?: boolean;
      }[] = [];

      const parts = html.split(/<div class="achieveRow/i);
      this.logger.debug(`Community HTML split into ${parts.length - 1} achieveRow sections`);
      for (let i = 1; i < parts.length; i++) {
        const block = parts[i];

        const imgMatch = /<img src="([^"]+)"/i.exec(block);
        const nameMatch = /<h3>([\s\S]*?)<\/h3>/i.exec(block);
        const descMatch = /<h5>([\s\S]*?)<\/h5>/i.exec(block);
        const isSecret =
          /secret_achievement/i.test(block) || /Hidden Achievement/i.test(nameMatch?.[1] || '');

        const name = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : '';
        const path = imgMatch ? imgMatch[1].trim() : '';

        if (name) {
          achievements.push({
            name,
            description,
            path,
            hidden: isSecret,
          });
        }
      }

      this.logger.debug(
        `Parsed ${achievements.length} achievements via Community HTML for steamAppId ${steamAppId}`,
      );
      return achievements;
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch achievements via Community HTML for steamAppId ${steamAppId}: ${err?.message || err}`,
      );
      return [];
    }
  }
}
