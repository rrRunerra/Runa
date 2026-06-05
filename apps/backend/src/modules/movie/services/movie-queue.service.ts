import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, EMPTY } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { MovieRepository } from '../repositories/movie.repository';

@Injectable()
export class MovieQueueService implements OnModuleInit {
  private readonly logger = new Logger(MovieQueueService.name);
  private readonly jobQueue = new Subject<number>();
  private readonly processing = new Set<number>();

  constructor(private readonly movieRepository: MovieRepository) {}

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
            this.logger.log(`Processing sync job for movie ${tvdbId}`);
            await this.syncMovieFromTvdb(tvdbId);
            this.logger.log(`Completed sync job for movie ${tvdbId}`);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to sync movie ${tvdbId}: ${message}`);
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

  private async syncMovieFromTvdb(tvdbId: number) {
    const movie = await this.fetchFromTvdb(tvdbId);
    if (movie) {
      await this.movieRepository.upsert(tvdbId, movie);
    }
  }

  private async fetchFromTvdb(tvdbId: number): Promise<any | null> {
    let token: string | null = null;

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

    const [movieRes, transRes] = await Promise.all([
      fetch(`https://api4.thetvdb.com/v4/movies/${tvdbId}/extended`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch(`https://api4.thetvdb.com/v4/movies/${tvdbId}/translations/eng`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    const [movieData, transData] = await Promise.all([
      movieRes.json(),
      transRes.json(),
    ]);

    if (movieData.message === 'Unauthorized' || !movieData.data) {
      throw new Error('TVdb API error');
    }

    const movie = movieData.data;
    const translation = transData.data;

    const englishName = translation?.name || movie.name;

    const artworks = movie.artworks || [];
    const movieBanners = artworks.filter((a: any) => a.type === 16 || a.type === 15);
    const randomBanner = movieBanners.length > 0
      ? movieBanners[Math.floor(Math.random() * movieBanners.length)].image
      : movie.bannerImage || null;

    return {
      tvdbId: movie.id,
      titleEnglish: englishName,
      titleRomaji: movie.name,
      coverImage: movie.image,
      bannerImage: randomBanner,
      description: movie.overview || '',
      status: movie.status?.name || 'FINISHED',
      runtime: movie.runtime,
      genres: movie.genres?.map((g: any) => g.name) || [],
      studios: movie.studios?.map((s: any) => s.name) || [],
      cast:
        movie.characters?.map((c: any) => ({
          name: c.name || '',
          personName: c.personName || '',
          image: c.image || '',
          role: c.peopleType || '',
        })) || [],
      originalCountry: movie.originalCountry || null,
      originalLanguage: movie.originalLanguage || null,
      contentRating:
        movie.contentRatings?.find((r: any) => r.country === 'usa')?.name ||
        movie.contentRatings?.[0]?.name ||
        null,
      trailers:
        movie.trailers?.map((t: any) => ({
          id: t.id?.toString() || '',
          name: t.name || 'Trailer',
          url: t.url || '',
          language: t.language || 'eng',
        })) || [],
    };
  }
}
