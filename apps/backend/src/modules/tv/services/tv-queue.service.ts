import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { TvRepository } from '../repositories/tv.repository';

@Injectable()
export class TvQueueService implements OnModuleInit {
  private readonly logger = new Logger(TvQueueService.name);
  private readonly jobQueue = new Subject<number>();
  private readonly processing = new Set<number>();

  constructor(private readonly tvRepository: TvRepository) {}

  onModuleInit() {
    this.processQueue();
  }

  addJob(tvdbId: number) {
    if (!this.processing.has(tvdbId)) {
      this.jobQueue.next(tvdbId);
    }
  }

  private processQueue() {
    this.jobQueue
      .pipe(
        mergeMap(async (tvdbId) => {
          if (this.processing.has(tvdbId)) {
            return;
          }

          this.processing.add(tvdbId);

          try {
            this.logger.log(`Processing sync job for tv show ${tvdbId}`);
            await this.syncTvFromTvdb(tvdbId);
            this.logger.log(`Completed sync job for tv show ${tvdbId}`);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to sync tv show ${tvdbId}: ${message}`);
          } finally {
            this.processing.delete(tvdbId);
          }
        }, 3),
        catchError((error) => {
          this.logger.error(`Queue error: ${error}`);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private async syncTvFromTvdb(tvdbId: number) {
    const tv = await this.fetchFromTvdb(tvdbId);
    if (tv) {
      await this.tvRepository.upsert(tvdbId, tv);
    }
  }

  private async fetchFromTvdb(tvdbId: number): Promise<any | null> {
    let token: string | null = null;
    const id = tvdbId.toString();

    const loginRes = await fetch('https://api4.thetvdb.com/v4/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: process.env.THETVDB_KEY,
      }),
    });
    const loginData = await loginRes.json();
    if (loginData.data) {
      token = loginData.data.token;
    } else {
      throw new Error(loginData.message);
    }

    const seriesRes = await fetch(
      `https://api4.thetvdb.com/v4/series/${id}/extended`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const seriesData = await seriesRes.json();

    if (seriesData.message == 'Unauthorized' || !seriesData.data) {
      throw new Error('TVdb API error');
    }

    const series = seriesData.data;

    const transRes = await fetch(
      `https://api4.thetvdb.com/v4/series/${id}/translations/eng`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const transData = await transRes.json();
    const translation = transData.data;

    const englishName = translation?.name || series.name;
    const englishOverview = translation?.overview || series.overview || '';

    const episodesRes = await fetch(
      `https://api4.thetvdb.com/v4/series/${id}/episodes/official/eng`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const episodesData = await episodesRes.json();
    const allEpisodes = episodesData.data?.episodes || [];

    const seasons =
      series.seasons
        ?.filter((s: any) => s.type.id === 1)
        .filter((s: any) => s.number !== 0)
        .sort((a: any, b: any) => a.number - b.number)
        .map((s: any) => {
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
                ep.overviewTranslations?.find((t: any) => t.language === 'eng')
                  ?.overview || ep.overview,
              image: ep.image ?? '',
              airDate: ep.aired ?? '',
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
        .filter((s: any) => s.episodes.length > 0) || [];

    return {
      tvdbId: series.id,
      titleEnglish: englishName,
      titleRomaji: series.name,
      coverImage: series.image,
      bannerImage: series.bannerImage,
      description: englishOverview,
      status: series.status?.name || 'FINISHED',
      originalCountry: series.originalCountry || null,
      originalLanguage: series.originalLanguage || null,
      tvType: series.type || null,
      averageRuntime: series.averageRuntime || null,
      contentRating:
        series.contentRatings?.find((r: any) => r.country === 'usa')?.name ||
        series.contentRatings?.[0]?.name ||
        null,
      genres: series.genres?.map((g: any) => g.name) || [],
      studios:
        series.companies
          ?.filter(
            (co: any) =>
              co.companyType?.name === 'Network' ||
              co.companyType?.name === 'Production Company',
          )
          .map((s: any) => s.name) || [],
      cast:
        series.characters?.map((c: any) => ({
          name: c.name ?? '',
          personName: c.personName ?? '',
          image: c.image ?? '',
          role: c.peopleType ?? '',
        })) || [],
      trailers:
        series.trailers?.map((t: any) => ({
          id: t.id?.toString(),
          name: t.name,
          url: t.url,
          language: t.language,
        })) || [],
      seasons: seasons,
    };
  }
}
