import { Injectable, Logger } from '@nestjs/common';

export interface MalData {
  id: number;
  mean?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  scored_by?: number | null;
  pictures?: string[];
  studios?: { malId: number; name: string }[];
  opening_themes?: any[];
  ending_themes?: any[];
  rating?: string | null;
}

export interface MalCharactersAndStaff {
  malCharacters: { malId: number; name: string; normKey: string; image?: string }[];
  malPeopleMap: Map<string, { malId: number; name: string; image?: string; language?: string }>;
}

function normalizeNameKey(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join('');
}

@Injectable()
export class MalService {
  private readonly logger = new Logger(MalService.name);

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
            `Rate limit hit (429) for ${url}. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        return res;
      } catch (err: any) {
        if (attempt === maxRetries - 1) {
          this.logger.warn(`Fetch failed for ${url}: ${err.message}`);
          return null;
        }
        const waitMs = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    return null;
  }

  public async fetchMalData(malId: number): Promise<MalData | null> {
    if (!malId) return null;
    const clientId = process.env.MAL_CLIENT_ID;

    // 1. Try Official MAL API v2
    if (clientId) {
      try {
        const url = `https://api.myanimelist.net/v2/anime/${malId}?fields=id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,num_favorites,nsfw,genres,media_type,status,pictures,background,num_episodes,start_season,broadcast,source,average_episode_duration,rating,studios,producers,licensors,opening_themes,ending_themes`;
        const res = await this.fetchWithRateLimit(url, {
          headers: { 'X-MAL-CLIENT-ID': clientId },
        });
        if (res && res.ok) {
          const data = await res.json();
          if (data?.id) {
            const combinedStudios = [
              ...(data.studios || []),
              ...(data.producers || []),
              ...(data.licensors || []),
            ];
            return {
              id: data.id,
              mean: data.mean,
              popularity: data.popularity,
              members: data.num_list_users,
              favorites: data.num_favorites || data.favorites,
              scored_by: data.num_scoring_users,
              pictures: (data.pictures || []).map((p: any) => p.large || p.medium),
              studios: combinedStudios.map((s: any) => ({
                malId: s.id || s.mal_id,
                name: s.name,
              })),
              opening_themes: data.opening_themes,
              ending_themes: data.ending_themes,
              rating: data.rating || null,
            };
          }
        }
      } catch (err: any) {
        this.logger.warn(`Official MAL API v2 error for ${malId}: ${err.message}`);
      }
    }

    // 2. Jikan MAL Fallback
    try {
      const [animeRes, picRes] = await Promise.all([
        this.fetchWithRateLimit(`https://api.jikan.moe/v4/anime/${malId}`),
        this.fetchWithRateLimit(`https://api.jikan.moe/v4/anime/${malId}/pictures`),
      ]);

      if (animeRes && animeRes.ok) {
        const jikanData = await animeRes.json();
        let pictures: string[] = [];
        if (picRes && picRes.ok) {
          const jikanPicData = await picRes.json();
          pictures = (jikanPicData?.data || []).map(
            (p: any) => p.jpg?.large_image_url || p.jpg?.image_url,
          );
        }

        if (jikanData?.data) {
          const item = jikanData.data;
          const combinedStudios = [
            ...(item.studios || []),
            ...(item.producers || []),
            ...(item.licensors || []),
          ];
          return {
            id: item.mal_id,
            mean: item.score,
            popularity: item.popularity,
            members: item.members,
            favorites: item.favorites,
            scored_by: item.scored_by,
            pictures,
            studios: combinedStudios.map((s: any) => ({
              malId: s.mal_id || s.id,
              name: s.name,
            })),
            rating: item.rating || null,
          };
        }
      }
    } catch (err: any) {
      this.logger.warn(`Jikan MAL fallback error for ${malId}: ${err.message}`);
    }

    return null;
  }

  public async fetchCharactersAndStaff(
    malId: number,
  ): Promise<MalCharactersAndStaff> {
    const malCharacters: { malId: number; name: string; normKey: string; image?: string }[] = [];
    const malPeopleMap = new Map<string, { malId: number; name: string; image?: string; language?: string }>();

    if (!malId) return { malCharacters, malPeopleMap };

    try {
      const [charRes, staffRes] = await Promise.all([
        this.fetchWithRateLimit(`https://api.jikan.moe/v4/anime/${malId}/characters`),
        this.fetchWithRateLimit(`https://api.jikan.moe/v4/anime/${malId}/staff`),
      ]);

      if (charRes && charRes.ok) {
        const charJson = await charRes.json();
        if (charJson?.data) {
          for (const item of charJson.data) {
            if (item.character) {
              const normKey = normalizeNameKey(item.character.name);
              malCharacters.push({
                malId: item.character.mal_id,
                name: item.character.name,
                normKey,
                image: item.character.images?.jpg?.image_url,
              });
            }
            if (item.voice_actors) {
              for (const va of item.voice_actors) {
                if (va.person) {
                  const normKey = normalizeNameKey(va.person.name);
                  malPeopleMap.set(normKey, {
                    malId: va.person.mal_id,
                    name: va.person.name,
                    image: va.person.images?.jpg?.image_url,
                    language: va.language,
                  });
                }
              }
            }
          }
        }
      }

      if (staffRes && staffRes.ok) {
        const staffJson = await staffRes.json();
        if (staffJson?.data) {
          for (const item of staffJson.data) {
            if (item.person) {
              const normKey = normalizeNameKey(item.person.name);
              malPeopleMap.set(normKey, {
                malId: item.person.mal_id,
                name: item.person.name,
                image: item.person.images?.jpg?.image_url,
              });
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to fetch MAL characters & staff for MAL ID ${malId}: ${err.message}`,
      );
    }

    return { malCharacters, malPeopleMap };
  }

  public async fetchEpisodes(malId: number): Promise<Record<number, any>> {
    const jikanEpisodesMap: Record<number, any> = {};
    if (!malId) return jikanEpisodesMap;

    try {
      const res = await this.fetchWithRateLimit(`https://api.jikan.moe/v4/anime/${malId}/episodes`);
      if (res && res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          for (const item of json.data) {
            const epNum = item.mal_id || item.episode_id;
            if (epNum) {
              jikanEpisodesMap[epNum] = item;
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch Jikan episodes for MAL ID ${malId}: ${err.message}`);
    }

    return jikanEpisodesMap;
  }

  public async fetchMalMangaData(malId: number): Promise<any | null> {
    if (!malId) return null;
    const clientId = process.env.MAL_CLIENT_ID;

    if (clientId) {
      try {
        const url = `https://api.myanimelist.net/v2/manga/${malId}?fields=id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,num_favorites,nsfw,genres,media_type,status,pictures,background,num_volumes,num_chapters,authors,serialization`;
        const res = await this.fetchWithRateLimit(url, {
          headers: { 'X-MAL-CLIENT-ID': clientId },
        });
        if (res && res.ok) {
          const data = await res.json();
          if (data?.id) {
            return {
              id: data.id,
              mean: data.mean,
              popularity: data.popularity,
              members: data.num_list_users,
              favorites: data.num_favorites || data.favorites,
              scored_by: data.num_scoring_users,
              pictures: (data.pictures || []).map((p: any) => p.large || p.medium),
              authors: (data.authors || []).map((a: any) => ({
                malId: a.node?.id,
                name: `${a.node?.first_name || ''} ${a.node?.last_name || ''}`.trim() || a.node?.name,
                role: a.role,
              })),
              serialization: data.serialization?.map((s: any) => s.name).join(', ') || null,
            };
          }
        }
      } catch (err: any) {
        this.logger.warn(`Official MAL API v2 manga error for ${malId}: ${err.message}`);
      }
    }

    try {
      const [mangaRes, picRes] = await Promise.all([
        this.fetchWithRateLimit(`https://api.jikan.moe/v4/manga/${malId}`),
        this.fetchWithRateLimit(`https://api.jikan.moe/v4/manga/${malId}/pictures`),
      ]);

      if (mangaRes && mangaRes.ok) {
        const jikanData = await mangaRes.json();
        let pictures: string[] = [];
        if (picRes && picRes.ok) {
          const jikanPicData = await picRes.json();
          pictures = (jikanPicData?.data || []).map(
            (p: any) => p.jpg?.large_image_url || p.jpg?.image_url,
          );
        }

        if (jikanData?.data) {
          const item = jikanData.data;
          return {
            id: item.mal_id,
            mean: item.score,
            popularity: item.popularity,
            members: item.members,
            favorites: item.favorites,
            scored_by: item.scored_by,
            pictures,
            authors: (item.authors || []).map((a: any) => ({
              malId: a.mal_id,
              name: a.name,
            })),
            serialization: (item.serializations || []).map((s: any) => s.name).join(', ') || null,
          };
        }
      }
    } catch (err: any) {
      this.logger.warn(`Jikan MAL manga fallback error for ${malId}: ${err.message}`);
    }

    return null;
  }
}
