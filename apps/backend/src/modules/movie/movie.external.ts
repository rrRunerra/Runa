import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { rrError } from 'src/providers/error';
import { MovieSearchEntity } from './movie.entities';
import type {
  TvdbSearchResponse,
  TvdbMovieResponse,
  TvdbTranslationResponse,
  TvdbMovieExtended,
  TvdbLoginResponse,
} from './movie.types';

function isCrewRole(roleOrType?: any): boolean {
  if (!roleOrType) return false;
  const lower = String(roleOrType).toLowerCase();
  const crewKeywords = [
    'writer',
    'director',
    'producer',
    'screenplay',
    'composer',
    'creator',
    'editor',
    'cinematography',
    'cinematographer',
    'executive',
    'author',
    'script',
    'story',
    'sound',
    'music',
    'art',
  ];
  return crewKeywords.some((k) => lower.includes(k));
}

function mapStaffRole(jobStr?: string, departmentStr?: string): string {
  if (!jobStr && !departmentStr) return 'OTHER';
  const lower = (jobStr || departmentStr || '').toLowerCase();
  if (lower.includes('director')) return 'DIRECTOR';
  if (
    lower.includes('screenplay') ||
    lower.includes('writer') ||
    lower.includes('script') ||
    lower.includes('story')
  )
    return 'SCRIPT';
  if (lower.includes('character design')) return 'CHARACTER_DESIGN';
  if (lower.includes('art direction') || lower.includes('art director'))
    return 'ART_DIRECTOR';
  if (
    lower.includes('music') ||
    lower.includes('composer') ||
    lower.includes('original score')
  )
    return 'COMPOSER';
  if (lower.includes('sound') || lower.includes('audio'))
    return 'SOUND_DIRECTOR';
  if (lower.includes('executive producer')) return 'EXECUTIVE_PRODUCER';
  if (lower.includes('producer')) return 'PRODUCER';
  if (lower.includes('color') || lower.includes('palette'))
    return 'COLOR_DESIGN';
  if (lower.includes('animator') || lower.includes('animation'))
    return 'KEY_ANIMATION';
  return 'OTHER';
}

function parseBigIntSafe(val?: any): bigint | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return null;
  return BigInt(Math.floor(num));
}

function parseAgeRating(
  contentRatings?: { name: string; country: string }[] | null,
): { ageRating: string | null; ageRatingGuide: string | null } {
  if (!contentRatings || contentRatings.length === 0) {
    return { ageRating: null, ageRatingGuide: null };
  }
  const usaRating = contentRatings.find(
    (c) => c.country?.toLowerCase() === 'usa' || c.country?.toLowerCase() === 'us',
  );
  const ratingObj = usaRating || contentRatings[0];
  const r = ratingObj.name.toUpperCase();

  if (r.includes('G')) return { ageRating: 'G', ageRatingGuide: 'General Audiences' };
  if (r.includes('PG-13')) return { ageRating: 'PG-13', ageRatingGuide: 'Parents Strongly Cautioned' };
  if (r.includes('PG')) return { ageRating: 'PG', ageRatingGuide: 'Parental Guidance Suggested' };
  if (r.includes('R')) return { ageRating: 'R', ageRatingGuide: 'Restricted (17+)' };
  if (r.includes('NC-17')) return { ageRating: 'NC-17', ageRatingGuide: 'No One 17 and Under Admitted' };

  return { ageRating: ratingObj.name, ageRatingGuide: null };
}

@Injectable()
export class MovieExternal {
  private readonly logger = new Logger(MovieExternal.name);
  private readonly moduleCode = 'MoExt-';
  private readonly baseUrl = 'https://api4.thetvdb.com/v4';
  private token: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async ensureToken(): Promise<void> {
    if (this.token) return;
    await this.login();
  }

  private async login(): Promise<void> {
    const apiKey = process.env.THETVDB_KEY;
    if (!apiKey) return;
    try {
      const res = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apikey: apiKey }),
      });
      const data = (await res.json()) as TvdbLoginResponse;
      if (data.data?.token) {
        this.token = data.data.token;
      }
    } catch (err: any) {
      this.logger.warn(`TVDB login failed: ${err.message}`);
    }
  }

  private async tvdbFetch<T>(url: string, retries = 1): Promise<T | null> {
    await this.ensureToken();
    if (!this.token) return null;

    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (res.status === 401 && retries > 0) {
        this.token = null;
        await this.ensureToken();
        return this.tvdbFetch<T>(url, retries - 1);
      }

      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 + 500 : 2000;
        this.logger.warn(`TVDB rate limited. Retrying in ${waitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return this.tvdbFetch<T>(url, retries);
      }

      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch (err: any) {
      this.logger.warn(`TVDB fetch error for ${url}: ${err.message}`);
      return null;
    }
  }

  public async fetchFullV2Record(inputParam: string | number): Promise<any | null> {
    const tvdbId = typeof inputParam === 'number' ? inputParam : parseInt(String(inputParam), 10);
    if (isNaN(tvdbId)) return null;

    try {
      this.logger.debug(`Fetching complete V2 movie record for TVDB ID: ${tvdbId}`);

      const [movieData, transData] = await Promise.all([
        this.tvdbFetch<TvdbMovieResponse>(`${this.baseUrl}/movies/${tvdbId}/extended`),
        this.tvdbFetch<TvdbTranslationResponse>(
          `${this.baseUrl}/movies/${tvdbId}/translations/eng`,
        ),
      ]);

      if (!movieData || !movieData.data) {
        this.logger.warn(`Movie with TVDB ID ${tvdbId} not found`);
        return null;
      }

      const movie = movieData.data;
      const translation = transData?.data || null;

      const englishName = translation?.name || movie.name || 'Untitled';
      const englishOverview = translation?.overview || movie.overview || null;

      const remoteIds = movie.remoteIds || [];
      const tmdbIdStr = remoteIds.find((r) => r.type === 10)?.id;
      const imdbId = remoteIds.find((r) => r.type === 2)?.id || null;
      const tmdbId = tmdbIdStr ? parseInt(tmdbIdStr) : null;

      let releaseDateYear: number | null = null;
      let releaseDateMonth: number | null = null;
      let releaseDateDay: number | null = null;

      const releaseRaw = movie.first_release?.date ?? movie.releases?.[0]?.date ?? null;
      if (releaseRaw) {
        const parts = releaseRaw.split('-');
        if (parts.length === 3) {
          releaseDateYear = parseInt(parts[0]) || null;
          releaseDateMonth = parseInt(parts[1]) || null;
          releaseDateDay = parseInt(parts[2]) || null;
        }
      }

      const formatTvdbUrl = (img?: string): string | null => {
        if (!img) return null;
        if (img.startsWith('http')) return img;
        return `https://artworks.thetvdb.com/${img.replace(/^\//, '')}`;
      };

      const artworks = movie.artworks || [];
      const posters = artworks
        .filter((a) => a.type === 2 || a.type === 7 || a.type === 14)
        .map((a) => formatTvdbUrl(a.image))
        .filter(Boolean) as string[];
      const backdrops = artworks
        .filter((a) => a.type === 3 || a.type === 15 || a.type === 16)
        .map((a) => formatTvdbUrl(a.image))
        .filter(Boolean) as string[];

      const coverImage = formatTvdbUrl(movie.image) || posters[0] || null;
      const bannerImage = backdrops[0] || null;

      const images = {
        tvdb: {
          posters,
          backdrops,
        },
      };

      const allStudios: { name: string; isMain: boolean }[] = [];
      if (movie.companies) {
        for (const companyList of [
          movie.companies.studio,
          movie.companies.production,
          movie.companies.network,
          movie.companies.distributor,
        ]) {
          if (Array.isArray(companyList)) {
            for (const company of companyList) {
              if (company.name && !allStudios.some((s) => s.name === company.name)) {
                allStudios.push({
                  name: company.name,
                  isMain: companyList === movie.companies.studio,
                });
              }
            }
          }
        }
      }

      const characters: any[] = [];
      const staff: any[] = [];

      if (movie.characters && Array.isArray(movie.characters)) {
        for (const p of movie.characters as any[]) {
          const roleType = p.peopleType || p.role || p.type || p.job || '';
          const charName = p.name || p.character;
          const actorName = p.personName || p.name;
          const personId = p.personId || p.peopleId || p.id;
          const personPhoto = p.personImgURL || p.image || null;

          if (
            isCrewRole(roleType) ||
            isCrewRole(charName) ||
            isCrewRole(p.job) ||
            p.type === 1 ||
            p.type === 2 ||
            p.type === 7 ||
            p.type === 11
          ) {
            staff.push({
              tvDBId: personId || null,
              namePrimary: actorName || charName || 'Unknown Staff',
              role: mapStaffRole(roleType || p.job, p.department),
              customRole: roleType || p.job || 'Crew Member',
              image: formatTvdbUrl(personPhoto) || null,
            });
          } else {
            const characterName = charName && charName !== actorName ? charName : actorName;
            characters.push({
              anilistId: null,
              namePrimary: characterName || 'Unknown Character',
              image: formatTvdbUrl(personPhoto) || null,
              role: 'MAIN',
              actor: actorName
                ? {
                    tvDBId: personId || null,
                    namePrimary: actorName,
                    image: formatTvdbUrl(personPhoto) || null,
                  }
                : null,
            });
          }
        }
      }

      const { ageRating, ageRatingGuide } = parseAgeRating(movie.contentRatings);

      let status = 'RELEASED';
      if (movie.status?.name) {
        const s = movie.status.name.toUpperCase();
        if (s.includes('PRODUCTION')) status = 'IN_PRODUCTION';
        else if (s.includes('POST')) status = 'POST_PRODUCTION';
        else if (s.includes('CANCEL')) status = 'CANCELLED';
        else if (s.includes('RUMOR')) status = 'RUMORED';
      }

      return {
        tvDBId: movie.id,
        imdbId: imdbId || null,
        tmdbId: tmdbId || null,

        titlePrimary: englishName,
        titleSecondary: movie.name || null,
        titleNative: movie.name || null,
        tagline: null,

        coverImage,
        bannerImage,
        images,

        description: englishOverview,
        originalLanguage: movie.originalLanguage || null,
        countryOfOrigin: movie.originalCountry || null,
        runtime: movie.runtime || null,
        budget: parseBigIntSafe(movie.budget),
        revenue: parseBigIntSafe(movie.boxOffice),
        homepage: null,
        siteUrl: `https://thetvdb.com/movies/${movie.slug || movie.id}`,

        releaseDateYear,
        releaseDateMonth,
        releaseDateDay,

        genres: movie.genres?.map((g) => g.name) || [],
        status,
        isAdult: false,
        synonyms: [],
        trailers: (movie.trailers || []) as any,
        locked: false,

        sources: [
          {
            provider: 'THETVDB',
            externalId: String(movie.id),
            url: `https://thetvdb.com/movies/${movie.slug || movie.id}`,
          },
          ...(imdbId
            ? [
                {
                  provider: 'IMDB',
                  externalId: imdbId,
                  url: `https://www.imdb.com/title/${imdbId}`,
                },
              ]
            : []),
          ...(tmdbId
            ? [
                {
                  provider: 'TMDB',
                  externalId: String(tmdbId),
                  url: `https://www.themoviedb.org/movie/${tmdbId}`,
                },
              ]
            : []),
        ],

        ageRating,
        ageRatingGuide,

        tvdbUpdatedAt: Math.floor(Date.now() / 1000),

        characters,
        studios: allStudios,
        staff,
        relations: [],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch full V2 movie record for ${tvdbId}: ${message}`);
      return null;
    }
  }

  public async search(query: string): Promise<MovieSearchEntity[]> {
    try {
      this.logger.debug(`Searching TVDB for movies: "${query}"`);
      const data = await this.tvdbFetch<TvdbSearchResponse>(
        `${this.baseUrl}/search?query=${encodeURIComponent(query)}&type=movie&language=eng`,
      );

      if (!data || data.status === 'error' || !data.data) {
        return [];
      }

      const results: MovieSearchEntity[] = [];
      for (const item of data.data) {
        const tvdbId = parseInt(item.tvdb_id);
        if (isNaN(tvdbId)) continue;

        const titlePrimary = item.translations?.eng || item.name;
        const titleSecondary = item.name !== item.translations?.eng ? item.name : null;
        const coverImage = item.image || item.thumbnail || null;
        const releaseDateYear = item.year ? parseInt(item.year) : null;

        let dbRecord = await this.prisma.client.aquilaMovieV2.findUnique({
          where: { tvDBId: tvdbId },
          select: { id: true, tvDBId: true },
        });

        if (!dbRecord) {
          try {
            dbRecord = await this.prisma.client.aquilaMovieV2.create({
              data: {
                tvDBId: tvdbId,
                titlePrimary,
                titleSecondary,
                coverImage,
                releaseDateYear,
              },
              select: { id: true, tvDBId: true },
            });
          } catch {
            dbRecord = await this.prisma.client.aquilaMovieV2.findUnique({
              where: { tvDBId: tvdbId },
              select: { id: true, tvDBId: true },
            });
          }
        }

        results.push({
          id: dbRecord ? dbRecord.id : 0,
          tvdbId,
          title: titlePrimary,
          secondaryTitle: titleSecondary,
          coverImage,
          format: 'MOVIE',
          status: item.status || 'RELEASED',
          isAdult: false,
          averageScore: null,
          releaseDateYear,
        });
      }

      return results;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search movies in TVDB: ${message}`);
      return [];
    }
  }
}
