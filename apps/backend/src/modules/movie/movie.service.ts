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

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

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

  public async getMovie(id: string): Promise<Media> {
    const tvdbId = parseInt(id);
    if (isNaN(tvdbId)) {
      throw new Error('Invalid id format');
    }

    const dbMovie = await this.movieRepository.findByTvdbId(tvdbId);

    if (dbMovie) {
      const now = new Date();
      const updatedAt = new Date(dbMovie.updatedAt);
      const timeSinceUpdate = now.getTime() - updatedAt.getTime();

      if (timeSinceUpdate < CACHE_DURATION_MS) {
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

    return {
      id: movie.id.toString(),
      title: {
        romaji: movie.name,
        english: englishName,
      },
      coverImage: {
        large: movie.image,
      },
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
    };
  }
}
