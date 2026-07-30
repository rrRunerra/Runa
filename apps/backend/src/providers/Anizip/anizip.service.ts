import { Injectable, Logger } from '@nestjs/common';

export interface AniZipMappings {
  anilistId: number;
  anidbId: number | null;
  malId: number | null;
  tvdbId: number | null;
  kitsuId: number | null;
  bangumiId: number | null;
  mangaUpdatesId?: string | number | null;
  episodes: Record<string, any>;
  themeSongs?: { openings: string[]; endings: string[] };
}

@Injectable()
export class AnizipService {
  private readonly logger = new Logger(AnizipService.name);

  public async fetchMappings(anilistId: number): Promise<AniZipMappings | null> {
    if (!anilistId) return null;
    try {
      const res = await fetch(
        `https://api.ani.zip/mappings?anilist_id=${anilistId}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 RunaRealm/1.0',
          },
        },
      );

      if (!res.ok) return null;
      const data = await res.json();
      if (!data) return null;

      const mappings = data.mappings || data;
      return {
        anilistId,
        anidbId: mappings.anidb_id || mappings.anidbId || null,
        malId: mappings.mal_id || mappings.malId || null,
        tvdbId:
          mappings.thetvdb_id ||
          mappings.tvdb_id ||
          mappings.thetvdbId ||
          mappings.tvdbId ||
          null,
        kitsuId: mappings.kitsu_id || mappings.kitsuId || null,
        bangumiId:
          mappings.bangumi_id ||
          mappings.bangumiId ||
          mappings.bgm_id ||
          mappings.bgmId ||
          null,
        mangaUpdatesId:
          mappings.mangaupdates_id ||
          mappings.manga_updates_id ||
          mappings.mangaUpdatesId ||
          null,
        episodes: data.episodes || {},
        themeSongs: data.themeSongs || undefined,
      };
    } catch (err: any) {
      this.logger.warn(
        `AniZip mapping fetch failed for AniList ID ${anilistId}: ${err.message}`,
      );
      return null;
    }
  }
}
