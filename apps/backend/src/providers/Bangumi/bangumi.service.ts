import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BangumiService {
  private readonly logger = new Logger(BangumiService.name);

  public async fetchBangumiId(
    anilistId?: number,
    title?: string,
  ): Promise<number | null> {
    // 1. Search Bangumi API by title
    if (title) {
      try {
        const encoded = encodeURIComponent(title);
        const res = await fetch(
          `https://api.bgm.tv/search/subject/${encoded}?type=2&responseGroup=small`,
          {
            headers: {
              'User-Agent': 'RunaRealm/1.0',
            },
          },
        );
        if (res.ok) {
          const json = await res.json();
          if (json?.list?.[0]?.id) {
            return Number(json.list[0].id);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Bangumi search error for "${title}": ${err.message}`);
      }
    }

    return null;
  }
}
