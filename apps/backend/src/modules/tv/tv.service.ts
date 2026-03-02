import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import type {
  Media,
  SearchMedia,
  SearchApiResponse,
  SearchMediaItem,
} from '../../common/types/types';

@Injectable()
export class TvService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(TvService.name);
  private token: string | null = null;

  private async setTheTvDbToken(): Promise<void> {
    const loginRes = await fetch('https://api4.thetvdb.com/v4/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: process.env.THETVDB_KEY,
      }),
    });
    const data = await loginRes.json();

    if (data.data) {
      this.token = data.data.token;
    } else {
      throw new Error(data.message);
    }
  }

  public async search(name: string): Promise<SearchMedia[]> {
    if (!this.token) {
      await this.setTheTvDbToken();
    }
    const res = await fetch(
      `https://api4.thetvdb.com/v4/search?query=${name}&type=series&language=eng`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      },
    );

    const data: SearchApiResponse = await res.json();
    if (data.status == 'error') {
      await this.setTheTvDbToken();
      return this.search(name);
    }
    const result: SearchMedia[] = data.data.map((item: SearchMediaItem) => {
      const englishTitle = item.translations?.eng || item.name;
      return {
        title: {
          romaji: item.name,
          english: englishTitle,
        },
        coverImage: {
          large: item.thumbnail || '',
        },
        format: item.type || 'TV',
        status: item.status || 'FINISHED',
        isAdult: false,
        id: item.tvdb_id?.toString() || item.id?.toString() || '',
      };
    });
    return result;
  }

  public async getTv(id: string): Promise<Media> {
    if (!this.token) {
      await this.setTheTvDbToken();
    }

    // Fetch extended series data (includes seasons, but not all episodes)
    const seriesRes = await fetch(
      `https://api4.thetvdb.com/v4/series/${id}/extended`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      },
    );

    const seriesData = await seriesRes.json();

    if (seriesData.message == 'Unauthorized') {
      await this.setTheTvDbToken();
      return this.getTv(id);
    }

    const series = seriesData.data;

    // Explicitly fetch English translations for the series
    const transRes = await fetch(
      `https://api4.thetvdb.com/v4/series/${id}/translations/eng`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      },
    );
    const transData = await transRes.json();
    const translation = transData.data;

    const englishName = translation?.name || series.name;
    const englishOverview = translation?.overview || series.overview || '';

    // Fetch all episodes in 'official' (aired) order with English translations
    const episodesRes = await fetch(
      `https://api4.thetvdb.com/v4/series/${id}/episodes/official/eng`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      },
    );
    const episodesData = await episodesRes.json();
    const allEpisodes = episodesData.data?.episodes || [];

    return {
      id: series.id.toString(),
      title: {
        romaji: series.name,
        english: englishName,
      },
      coverImage: {
        large: series.image,
      },
      format: 'TV',
      status: series.status?.name || 'FINISHED',
      description: englishOverview,
      genres: series.genres?.map((g: any) => g.name) || [],
      trailers:
        series.trailers?.map((t: any) => ({
          id: t.id.toString(),
          name: t.name,
          url: t.url,
          language: t.language,
        })) || [],
      characters:
        series.characters?.map((c: any) => ({
          id: c.id.toString(),
          name: c.name,
          personName: c.personName,
          image: c.image,
          role: c.peopleType,
        })) || [],
      studios:
        series.companies
          ?.filter(
            (co: any) =>
              co.companyType.name === 'Network' ||
              co.companyType.name === 'Production Company',
          )
          .map((s: any) => ({
            id: s.id.toString(),
            name: s.name,
          })) || [],
      seasons:
        series.seasons
          ?.filter((s: any) => s.type.id === 1)
          .sort((a: any, b: any) => a.number - b.number)
          .map((s: any) => {
            // Map episodes that belong to this season
            const seasonEpisodes = allEpisodes
              .filter((ep: any) => ep.seasonNumber === s.number)
              .map((ep: any) => ({
                id: ep.id.toString(),
                number: ep.number,
                name:
                  ep.nameTranslations?.find((t: any) => t.language === 'eng')
                    ?.name ||
                  ep.name ||
                  `Episode ${ep.number}`,
                overview:
                  ep.overviewTranslations?.find(
                    (t: any) => t.language === 'eng',
                  )?.overview || ep.overview,
                image: ep.image,
                airDate: ep.aired,
              }))
              .sort((a: any, b: any) => a.number - b.number);

            return {
              id: s.id.toString(),
              number: s.number,
              name:
                s.nameTranslations?.find((t: any) => t.language === 'eng')
                  ?.name || s.name,
              image: s.image,
              episodeCount: seasonEpisodes.length,
              episodes: seasonEpisodes,
            };
          })
          .filter((s: any) => s.episodes.length > 0) || [],
    };
  }
}
