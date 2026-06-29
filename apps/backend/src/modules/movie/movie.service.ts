import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import type {
  Media,
  SearchMedia,
  SearchApiResponse,
  SearchMediaItem,
} from '../../common/types/types';
import { MovieRepository } from './repositories/movie.repository';
import { MovieQueueService } from './services/movie-queue.service';

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const CACHE_DURATION_MS = isDev ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class MovieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movieRepository: MovieRepository,
    private readonly movieQueueService: MovieQueueService,
  ) {}

  private readonly logger = new Logger(MovieService.name);
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
      `https://api4.thetvdb.com/v4/search?query=${name}&type=movie&language=eng`,
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
        format: item.type || 'MOVIE',
        status: item.status || 'FINISHED',
        isAdult: false,
        id: item.tvdb_id?.toString() || '',
      };
    });
    return result;
  }

  public async getMovie(id: string, forceRefresh = false): Promise<Media> {
    const tvdbId = parseInt(id);
    if (isNaN(tvdbId)) {
      throw new Error('Invalid id format');
    }

    const dbMovie = await this.movieRepository.findByTvdbId(tvdbId);

    if (dbMovie && !forceRefresh) {
      const now = new Date();
      const updatedAt = new Date(dbMovie.updatedAt);
      const timeSinceUpdate = now.getTime() - updatedAt.getTime();

      if (timeSinceUpdate < CACHE_DURATION_MS && dbMovie.description !== null) {
        return this.movieRepository.toMedia(dbMovie);
      }
    }

    try {
      const media = await this.fetchFromTvdb(tvdbId);

      this.movieQueueService.addJob(tvdbId);

      return media;
    } catch (error) {
      if (dbMovie) {
        return this.movieRepository.toMedia(dbMovie);
      }
      throw new NotFoundException('Movie not found');
    }
  }

  private async fetchFromTvdb(tvdbId: number): Promise<Media> {
    if (!this.token) {
      await this.setTheTvDbToken();
    }

    const [movieRes, transRes] = await Promise.all([
      fetch(`https://api4.thetvdb.com/v4/movies/${tvdbId}/extended`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      }),
      fetch(`https://api4.thetvdb.com/v4/movies/${tvdbId}/translations/eng`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      }),
    ]);

    const [movieData, transData] = await Promise.all([
      movieRes.json(),
      transRes.json(),
    ]);

    if (movieData.message == 'Unauthorized') {
      await this.setTheTvDbToken();
      return this.fetchFromTvdb(tvdbId);
    }

    if (!movieData.data) {
      throw new Error(`Movie with ID ${tvdbId} not found`);
    }

    const movie = movieData.data;
    const translation = transData.data;

    const englishName = translation?.name || movie.name;
    const englishOverview = translation?.overview || movie.overview || '';

    const artworks = movie.artworks || [];
    const movieBanners = artworks.filter((a: any) => a.type === 16 || a.type === 15);
    const randomBanner = movieBanners.length > 0
      ? movieBanners[Math.floor(Math.random() * movieBanners.length)].image
      : movie.bannerImage || null;

    return {
      id: movie.id.toString(),
      title: {
        romaji: movie.name,
        english: englishName,
      },
      coverImage: {
        large: movie.image,
      },
      bannerImage: randomBanner,
      format: 'MOVIE',
      status: movie.status?.name || 'FINISHED',
      description: englishOverview,
      runtime: movie.runtime,
      genres: movie.genres?.map((g: any) => g.name) || [],
      characters:
        movie.characters?.map((c: any) => ({
          name: c.name ?? '',
          personName: c.personName ?? '',
          image: c.image ?? '',
          role: c.peopleType ?? '',
        })) || [],
      studios:
        movie.studios?.map((s: any) => ({
          id: s.id.toString(),
          name: s.name,
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

  public async ensureMovie(tvdbId: number, title?: string, coverImage?: string) {
    let movie = await this.movieRepository.findByTvdbId(tvdbId);
    if (!movie || movie.description === null) {
      try {
        const fullMovie = await this.fetchFromTvdb(tvdbId);
        const dbData = {
          tvdbId: parseInt(fullMovie.id),
          titleEnglish: fullMovie.title.english || null,
          titleRomaji: fullMovie.title.romaji || null,
          coverImage: fullMovie.coverImage.large || null,
          bannerImage: fullMovie.bannerImage || null,
          description: fullMovie.description || null,
          status: fullMovie.status || null,
          runtime: fullMovie.runtime || null,
          genres: fullMovie.genres || [],
          studios: fullMovie.studios?.map((s) => s.name) || [],
          cast: fullMovie.characters as any,
          trailers: fullMovie.trailers as any,
          originalCountry: fullMovie.originalCountry || null,
          originalLanguage: fullMovie.originalLanguage || null,
          contentRating: fullMovie.contentRating || null,
        };
        movie = await this.movieRepository.upsert(tvdbId, dbData);
      } catch (err) {
        if (!movie) {
          movie = await this.movieRepository.upsert(tvdbId, {
            tvdbId,
            titleRomaji: title || 'Unknown',
            coverImage: coverImage || '',
          });
          this.movieQueueService.addJob(tvdbId);
        }
      }
    }
    return movie;
  }
}
