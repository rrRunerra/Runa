import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import type {
  Media,
  SearchMedia,
  SearchApiResponse,
  SearchMediaItem,
} from '../../common/types/types';

@Injectable()
export class MovieService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (!this.token) {
      await this.setTheTvDbToken();
    }

    const res = await fetch(
      `https://api4.thetvdb.com/v4/movies/${id}/extended`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      },
    );

    const data = await res.json();

    if (data.message == 'Unauthorized') {
      await this.setTheTvDbToken();
      return this.getMovie(id);
    }

    const movie = data.data;

    // Explicitly fetch English translations for the movie
    const transRes = await fetch(
      `https://api4.thetvdb.com/v4/movies/${id}/translations/eng`,
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
      budget: movie.budget,
      boxOffice: movie.boxOffice,
      genres: movie.genres?.map((g: any) => g.name) || [],
      trailers:
        movie.trailers?.map((t: any) => ({
          id: t.id.toString(),
          name: t.name,
          url: t.url,
          language: t.language,
        })) || [],
      characters:
        movie.characters?.map((c: any) => ({
          id: c.id.toString(),
          name: c.name,
          personName: c.personName,
          image: c.image,
          role: c.peopleType,
        })) || [],
      studios:
        movie.studios?.map((s: any) => ({
          id: s.id.toString(),
          name: s.name,
        })) || [],
    };
  }
}
