import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { TvSearchEntity } from './tv.entities';
import { TvRepository } from './tv.repository';
import type {
  TvdbSearchResponse,
  TvdbSeriesResponse,
  TvdbTranslationResponse,
  TvdbEpisodesResponse,
  TvdbSeriesExtended,
  TvdbEpisode,
  TvdbLoginResponse,
} from './tv.types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function isCrewRole(roleOrType?: string): boolean {
  if (!roleOrType) return false;
  const lower = String(roleOrType).toLowerCase();
  const crewKeywords = [
    'writer', 'director', 'producer', 'screenplay', 'composer', 'creator',
    'editor', 'cinematography', 'cinematographer', 'executive', 'author',
    'script', 'story', 'sound', 'music', 'art',
  ];
  return crewKeywords.some((k) => lower.includes(k));
}

function mapStaffRole(jobStr?: string, departmentStr?: string): string {
  if (!jobStr && !departmentStr) return 'OTHER';
  const lower = (jobStr || departmentStr || '').toLowerCase();
  if (lower.includes('director')) return 'DIRECTOR';
  if (lower.includes('screenplay') || lower.includes('writer') || lower.includes('script') || lower.includes('story') || lower.includes('creator')) return 'SCRIPT';
  if (lower.includes('character design')) return 'CHARACTER_DESIGN';
  if (lower.includes('art direction') || lower.includes('art director')) return 'ART_DIRECTOR';
  if (lower.includes('music') || lower.includes('composer') || lower.includes('original score')) return 'COMPOSER';
  if (lower.includes('sound') || lower.includes('audio')) return 'SOUND_DIRECTOR';
  if (lower.includes('executive producer')) return 'EXECUTIVE_PRODUCER';
  if (lower.includes('producer')) return 'PRODUCER';
  return 'OTHER';
}

function mapTvStatus(statusObj?: any): string {
  const statusStr = typeof statusObj === 'string' ? statusObj : (statusObj?.name || statusObj?.status || '');
  if (!statusStr) return 'UNKNOWN';
  const upper = statusStr.toUpperCase();
  if (upper.includes('CONTINUING') || upper.includes('RETURNING') || upper.includes('RUNNING')) return 'RETURNING_SERIES';
  if (upper.includes('ENDED')) return 'ENDED';
  if (upper.includes('CANCEL')) return 'CANCELED';
  if (upper.includes('PROD') || upper.includes('DEVELOPMENT')) return 'IN_PRODUCTION';
  if (upper.includes('UPCOMING')) return 'UPCOMING';
  return 'UNKNOWN';
}

function parseDateParts(dateStr: string | null | undefined): { year: number | null; month: number | null; day: number | null } {
  if (!dateStr) return { year: null, month: null, day: null };
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return {
      year: parseInt(parts[0], 10) || null,
      month: parseInt(parts[1], 10) || null,
      day: parseInt(parts[2], 10) || null,
    };
  }
  return { year: null, month: null, day: null };
}

// ── TVMaze types ─────────────────────────────────────────────────────────────

interface TvmazeShow {
  id: number;
  name: string;
  type?: string;
  language?: string;
  genres?: string[];
  status?: string;
  runtime?: number;
  averageRuntime?: number;
  premiered?: string;
  ended?: string;
  officialSite?: string;
  rating?: { average?: number };
  network?: { name?: string; country?: { code?: string } };
  webChannel?: { name?: string };
  image?: { original?: string; medium?: string };
  summary?: string;
  externals?: { imdb?: string; thetvdb?: number; tvrage?: number };
  schedule?: { time?: string; days?: string[] };
  _embedded?: {
    episodes?: any[];
    cast?: any[];
    crew?: any[];
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class TvExternal {
  private readonly logger = new Logger(TvExternal.name);
  private readonly moduleCode = 'TvExt-';
  private readonly baseUrl = 'https://api4.thetvdb.com/v4';
  private token: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tvRepository: TvRepository,
  ) {}

  // ── TVDB Auth ──────────────────────────────────────────────────────────────

  private async ensureToken(): Promise<void> {
    if (this.token) return;
    await this.login();
  }

  private async login(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: process.env.THETVDB_KEY }),
    });
    const data = (await res.json()) as TvdbLoginResponse;
    if (!data.data?.token) {
      throw new InternalServerErrorException('Failed to login to TVDB');
    }
    this.token = data.data.token;
  }

  private async tvdbFetch<T>(url: string, retries = 1): Promise<T> {
    await this.ensureToken();
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
    return res.json() as Promise<T>;
  }

  // ── TVDB Episodes Pagination ───────────────────────────────────────────────

  private async fetchAllTvdbEpisodes(tvdbId: number): Promise<TvdbEpisode[]> {
    const allEpisodes: TvdbEpisode[] = [];
    let page = 0;
    const maxPages = 50; // Safety guard for up to 25,000 episodes
    let seasonType = 'official';

    try {
      while (page < maxPages) {
        const url = `${this.baseUrl}/series/${tvdbId}/episodes/${seasonType}/eng?page=${page}`;
        const res = await this.tvdbFetch<TvdbEpisodesResponse>(url);
        const dataObj: any = res?.data;
        const episodes: TvdbEpisode[] = Array.isArray(dataObj)
          ? dataObj
          : Array.isArray(dataObj?.episodes)
            ? dataObj.episodes
            : [];

        if (episodes.length === 0) {
          // If page 0 with 'official' season type returned 0 episodes, try fallback to 'default'
          if (page === 0 && seasonType === 'official') {
            seasonType = 'default';
            const defaultUrl = `${this.baseUrl}/series/${tvdbId}/episodes/default/eng?page=0`;
            const defaultRes = await this.tvdbFetch<TvdbEpisodesResponse>(defaultUrl);
            const defaultDataObj: any = defaultRes?.data;
            const defaultEps: TvdbEpisode[] = Array.isArray(defaultDataObj)
              ? defaultDataObj
              : Array.isArray(defaultDataObj?.episodes)
                ? defaultDataObj.episodes
                : [];

            if (defaultEps.length > 0) {
              allEpisodes.push(...defaultEps);
              const hasNext =
                Boolean(defaultRes?.links?.next) ||
                Boolean(
                  defaultRes?.links?.total_items &&
                    allEpisodes.length < defaultRes.links.total_items,
                );
              if (!hasNext) break;
              page++;
              continue;
            }
          }
          break;
        }

        allEpisodes.push(...episodes);

        const hasNext =
          Boolean(res?.links?.next) ||
          Boolean(
            res?.links?.total_items && allEpisodes.length < res.links.total_items,
          );

        if (!hasNext) {
          break;
        }
        page++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed fetching all TVDB episodes for series ${tvdbId}: ${msg}`);
    }

    return allEpisodes;
  }

  // ── TVMaze Fetch ───────────────────────────────────────────────────────────

  private async fetchTvmazeData(
    tvdbId?: number | null,
    imdbId?: string | null,
    title?: string | null,
  ): Promise<any> {
    try {
      let showData: any = null;

      if (tvdbId) {
        const res = await fetch(`https://api.tvmaze.com/lookup/shows?thetvdb=${tvdbId}`);
        if (res.ok) showData = await res.json();
      }
      if (!showData && imdbId) {
        const res = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
        if (res.ok) showData = await res.json();
      }
      if (!showData && title) {
        const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`);
        if (res.ok) showData = await res.json();
      }

      if (showData?.id) {
        return {
          tvmazeId: showData.id,
          name: showData.name,
          type: showData.type,
          language: showData.language,
          genres: showData.genres || [],
          status: showData.status,
          runtime: showData.runtime || showData.averageRuntime,
          premiered: showData.premiered,
          ended: showData.ended,
          officialSite: showData.officialSite,
          rating: showData.rating?.average || null,
          network: showData.network?.name || showData.webChannel?.name || null,
          networkCountry: showData.network?.country?.code || null,
          poster: showData.image?.original || showData.image?.medium || null,
          summary: showData.summary ? showData.summary.replace(/<[^>]*>?/gm, '') : null,
          imdbId: showData.externals?.imdb || null,
          thetvdbId: showData.externals?.thetvdb || null,
          tvrageId: showData.externals?.tvrage || null,
          broadcastTime: showData.schedule?.time || null,
          broadcastDays: showData.schedule?.days || [],
        };
      }
    } catch {
      this.logger.warn('TVMaze enrichment failed');
    }
    return null;
  }


  // ── OMDb / IMDb Fetch ──────────────────────────────────────────────────────

  private async fetchOmdbData(imdbId?: string | null, title?: string | null): Promise<any> {
    const apiKey = process.env.OMDB_API_KEY || 'trilogy';
    if (!imdbId && !title) return null;

    try {
      const query = imdbId ? `i=${imdbId}` : `t=${encodeURIComponent(title || '')}`;
      const url = `http://www.omdbapi.com/?${query}&type=series&apikey=${apiKey}&plot=full`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();

      if (data?.Response === 'True') {
        const rtRating = Array.isArray(data.Ratings)
          ? data.Ratings.find((r: any) => r.Source === 'Rotten Tomatoes')
          : null;
        const rottenTomatoesScore = rtRating ? parseFloat(rtRating.Value.replace('%', '')) : null;

        return {
          imdbRating: data.imdbRating && data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : null,
          imdbVotes: data.imdbVotes && data.imdbVotes !== 'N/A' ? parseInt(data.imdbVotes.replace(/,/g, ''), 10) : null,
          ageRating: data.Rated && data.Rated !== 'N/A' ? data.Rated : null,
          totalSeasons: data.totalSeasons && data.totalSeasons !== 'N/A' ? parseInt(data.totalSeasons, 10) : null,
          awards: data.Awards && data.Awards !== 'N/A' ? data.Awards : null,
          rottenTomatoesScore,
        };
      }
    } catch {
      this.logger.warn('OMDb enrichment failed');
    }
    return null;
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  public async search(query: string): Promise<TvSearchEntity[]> {
    try {
      this.logger.debug('Searching for TV series in TVDB');
      const data = await this.tvdbFetch<TvdbSearchResponse>(
        `${this.baseUrl}/search?query=${encodeURIComponent(query)}&type=series&language=eng`,
      );

      if (data.status === 'error' || !data.data) {
        return [];
      }

      return (
        await Promise.all(
          data.data.map(async (item) => {
            const tvdbId = parseInt(item.tvdb_id);
            if (isNaN(tvdbId)) return null;

            const existing = await this.prisma.client.aquilaTvV2.findUnique({
              where: { tvDBId: tvdbId },
              select: {
                id: true,
                titlePrimary: true,
                titleSecondary: true,
                coverImage: true,
                locked: true,
              },
            });

            let tv = existing;
            if (!existing?.locked) {
              tv = await this.prisma.client.aquilaTvV2.upsert({
                where: { tvDBId: tvdbId },
                update: {
                  titlePrimary: item.translations?.eng || item.name,
                  titleSecondary: item.name !== (item.translations?.eng || item.name) ? item.name : undefined,
                  coverImage: item.image || item.thumbnail,
                  status: mapTvStatus(item.status) as any,
                },
                create: {
                  tvDBId: tvdbId,
                  titlePrimary: item.translations?.eng || item.name,
                  titleSecondary: item.name !== (item.translations?.eng || item.name) ? item.name : null,
                  coverImage: item.image || item.thumbnail,
                  status: mapTvStatus(item.status) as any,
                },
                select: {
                  id: true,
                  titlePrimary: true,
                  titleSecondary: true,
                  coverImage: true,
                  locked: true,
                },
              });

              this.queueFetch(tvdbId);
            }

            if (!tv) return null;

            const searchItem: TvSearchEntity = {
              id: tv.id,
              title: tv.titlePrimary || item.translations?.eng || item.name,
              secondaryTitle: tv.titleSecondary || item.name || null,
              coverImage: tv.coverImage || item.image || item.thumbnail || null,
              format: 'TV',
              status: item.status || 'UNKNOWN',
              isAdult: false,
              averageScore: null,
            };
            return searchItem;
          }),
        )
      ).filter((r): r is TvSearchEntity => r !== null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search TV series in TVDB: ${message}`);
      throw new InternalServerErrorException('Failed to search TV series in TVDB');
    }
  }

  private queueFetch(tvdbId: number): void {
    this.fetchAndUpsertTv(tvdbId).catch((err: Error) =>
      this.logger.warn(
        `Background fetch failed for TV series ${tvdbId}: ${err.message}`,
      ),
    );
  }

  // ── Full Fetch + Multi-Provider Enrichment ─────────────────────────────────

  public async fetchAndUpsertTv(tvdbId: number, force = false): Promise<void> {
    try {
      // 1. Fetch primary TVDB data in parallel
      const [seriesData, transData, rawTvdbEpisodes] = await Promise.all([
        this.tvdbFetch<TvdbSeriesResponse>(
          `${this.baseUrl}/series/${tvdbId}/extended`,
        ),
        this.tvdbFetch<TvdbTranslationResponse>(
          `${this.baseUrl}/series/${tvdbId}/translations/eng`,
        ),
        this.fetchAllTvdbEpisodes(tvdbId),
      ]);

      if (!seriesData.data) {
        throw new InternalServerErrorException(
          `TV series with TVDB ID ${tvdbId} not found`,
        );
      }

      const series = seriesData.data;
      const translation = transData.data;

      const englishName = translation?.name || series.name;
      const englishOverview = translation?.overview || series.overview || '';

      // Extract remote IDs
      const remoteIds = series.remoteIds || [];
      const imdbRemote = remoteIds.find(
        (r) => r.type === 2 || String(r.id || '').startsWith('tt'),
      );
      const tmdbRemote = remoteIds.find((r) => r.type === 12 || r.type === 10);
      const imdbId = imdbRemote ? String(imdbRemote.id) : null;
      const tmdbId = tmdbRemote ? parseInt(tmdbRemote.id) : null;

      // Artworks
      const artworks = series.artworks || [];
      const posters = artworks.filter((a) => a.type === 2 || a.type === 14).map((a) => a.image);
      const backdrops = artworks.filter((a) => a.type === 3 || a.type === 15).map((a) => a.image);
      const logos = artworks.filter((a) => a.type === 23 || a.type === 25).map((a) => a.image);
      if (series.image && !posters.includes(series.image)) posters.unshift(series.image);

      const coverImage = posters[0] || null;
      const bannerImage = backdrops[0] || null;

      // Networks & studios from companies
      const networks = (series.companies || [])
        .filter((co) => co.companyType?.companyTypeName === 'Network')
        .map((n) => n.name);
      const studios = (series.companies || [])
        .filter((co) => co.companyType?.companyTypeName === 'Production Company')
        .map((s) => s.name);

      // Tags
      const tags = (series.tags || []).map((t) => t.name).filter(Boolean);

      // Content ratings
      const contentRatings = (series.contentRatings || []).map((c) => ({
        country: c.country,
        name: c.name,
      }));

      // Aliases
      const synonyms = ((series as any).aliases || [])
        .map((a: any) => (typeof a === 'string' ? a : a.name || a.alias || ''))
        .filter(Boolean);

      // Parse dates
      const firstAired = parseDateParts(series.firstAired);
      const lastAired = parseDateParts(series.lastAired);

      // 2. Fetch TVMaze enrichment
      const tvmazeData = await this.fetchTvmazeData(tvdbId, imdbId, englishName);

      // 3. Fetch OMDb / IMDb enrichment
      const omdbData = await this.fetchOmdbData(
        imdbId || tvmazeData?.imdbId,
        englishName,
      );

      // Merge networks
      const mergedNetworks = Array.from(new Set([
        ...networks,
        ...(tvmazeData?.network ? [tvmazeData.network] : []),
      ]));

      // Cast & Crew from TVDB
      const rawPeople = series.characters || [];
      const castPayload: any[] = [];
      const crewPayload: any[] = [];

      for (let idx = 0; idx < rawPeople.length; idx++) {
        const p = rawPeople[idx];
        if (!p.peopleId) continue;

        const roleType = p.peopleType || '';
        const charName = p.name;
        const actorName = p.personName || p.name;
        const personPhoto = p.image || null;

        if (isCrewRole(roleType) || isCrewRole(charName)) {
          crewPayload.push({
            namePrimary: actorName,
            image: personPhoto,
            role: mapStaffRole(roleType),
            customRole: roleType || 'Crew Member',
          });
        } else {
          castPayload.push({
            character: {
              namePrimary: charName && charName !== actorName ? charName : actorName,
              image: personPhoto,
            },
            actor: {
              namePrimary: actorName,
              image: personPhoto,
            },
            role: idx < 6 ? 'MAIN' : 'SUPPORTING',
            order: idx + 1,
          });
        }
      }

      // Build seasons + episodes from TVDB
      const seasonsMap = new Map<number, any>();
      const episodesList: any[] = [];

      // Pre-populate all official/aired seasons defined on the series (even if 0 episodes aired yet, e.g. upcoming season 25)
      for (const s of series.seasons || []) {
        // Only include official/aired order seasons (type 1 or where type is undefined/null or name indicates Aired/Official)
        if (s.type && s.type.id && s.type.id !== 1) {
          continue;
        }
        const sNum = s.number;
        if (sNum === undefined || sNum === null || isNaN(sNum)) continue;

        if (!seasonsMap.has(sNum)) {
          const sName =
            s.nameTranslations?.find((t: any) => t.language === 'eng')?.name ||
            s.name ||
            (sNum === 0 ? 'Specials' : `Season ${sNum}`);

          seasonsMap.set(sNum, {
            seasonNumber: sNum,
            tvdbSeasonId: s.id || null,
            tvmazeSeasonId: null,
            titlePrimary: sName,
            posterImage: s.image || null,
            airDateYear: firstAired.year,
            episodeCount: 0,
          });
        }
      }

      if (rawTvdbEpisodes.length > 0) {
        for (const ep of rawTvdbEpisodes) {
          const sNum = ep.seasonNumber ?? 1;
          const eNum = ep.number ?? 1;

          if (!seasonsMap.has(sNum)) {
            const tvdbSeason = series.seasons?.find(
              (s) => s.number === sNum && (!s.type || s.type.id === 1),
            );
            const posterImage = tvdbSeason?.image || null;

            seasonsMap.set(sNum, {
              seasonNumber: sNum,
              tvdbSeasonId: tvdbSeason?.id || null,
              tvmazeSeasonId: null,
              titlePrimary:
                tvdbSeason?.nameTranslations?.find((t: any) => t.language === 'eng')?.name ||
                tvdbSeason?.name ||
                (sNum === 0 ? 'Specials' : `Season ${sNum}`),
              posterImage,
              airDateYear: firstAired.year,
              episodeCount: 0,
            });
          }
          const seasonObj = seasonsMap.get(sNum);
          seasonObj.episodeCount++;

          const epName =
            ep.nameTranslations?.find((t) => t.language === 'eng')?.name ||
            ep.name ||
            `Episode ${eNum}`;
          const epOverview =
            ep.overviewTranslations?.find((t) => t.language === 'eng')?.overview ||
            ep.overview ||
            null;

          episodesList.push({
            seasonNumber: sNum,
            episodeNumber: eNum,
            titlePrimary: epName,
            description: epOverview,
            duration: ep.runtime ? Number(ep.runtime) : (series.averageRuntime || null),
            airDate: ep.aired || null,
            airTime: tvmazeData?.broadcastTime || null,
            airstamp: null,
            rating: null,
            episodeType: sNum === 0 ? 'special' : 'regular',
            thumbnail: ep.image || null,
            isFiller: false,
            isRecap: false,
          });
        }
      }

      const seasonsArray = Array.from(seasonsMap.values()).sort(
        (a, b) => a.seasonNumber - b.seasonNumber,
      );

      // Trailers
      const trailers = ((series as any).trailers || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        url: t.url,
        site: t.url?.includes('youtube') ? 'YouTube' : 'Other',
        key: t.url?.match(/v=([\w-]+)/)?.[1] || null,
        language: t.language || 'eng',
      }));

      // Build final V2 payload
      const payload = {
        tvDBId: tvdbId,
        imdbId: imdbId || tvmazeData?.imdbId || null,
        tmdbId: isNaN(tmdbId as number) ? null : tmdbId,
        traktId: null,
        tvmazeId: tvmazeData?.tvmazeId || null,
        tvrageId: tvmazeData?.tvrageId || null,

        titlePrimary: englishName || tvmazeData?.name || 'Unknown TV Show',
        titleSecondary: series.name !== englishName ? series.name : null,
        titleNative: null,
        tagline: (series as any).tagline || null,

        coverImage,
        bannerImage,
        images: {
          tvdb: { posters, backdrops, logos },
          tvmaze: tvmazeData?.poster ? { cover: tvmazeData.poster } : null,
        },

        description: englishOverview || tvmazeData?.summary || null,
        originalLanguage: series.originalLanguage
          ? String(series.originalLanguage).toUpperCase()
          : (tvmazeData?.language ? tvmazeData.language.substring(0, 2).toUpperCase() : null),
        countryOfOrigin: series.originalCountry
          ? String(series.originalCountry).toUpperCase()
          : (tvmazeData?.networkCountry || null),
        episodeCount: episodesList.length,
        seasonCount: seasonsArray.length,
        averageRuntime: series.averageRuntime || tvmazeData?.runtime || null,
        homepage: (series as any).homepage || tvmazeData?.officialSite || null,
        siteUrl: tvmazeData?.officialSite || `https://thetvdb.com/series/${series.slug || tvdbId}`,
        showType: tvmazeData?.type || null,

        broadcastTime: tvmazeData?.broadcastTime || null,
        broadcastDays: tvmazeData?.broadcastDays || [],

        firstAiredYear: firstAired.year,
        firstAiredMonth: firstAired.month,
        firstAiredDay: firstAired.day,

        lastAiredYear: lastAired.year,
        lastAiredMonth: lastAired.month,
        lastAiredDay: lastAired.day,

        genres: series.genres?.map((g) => g.name) || tvmazeData?.genres || [],
        tags,
        networks: mergedNetworks,
        studios,

        status: mapTvStatus(series.status || tvmazeData?.status),
        isAdult: false,
        synonyms,
        trailers,

        averageScore: null,
        imdbRating: omdbData?.imdbRating || null,
        imdbVotes: omdbData?.imdbVotes || null,
        tvmazeRating: tvmazeData?.rating || null,
        rottenTomatoesScore: omdbData?.rottenTomatoesScore || null,
        awards: omdbData?.awards || null,

        sources: [
          { provider: 'THETVDB', externalId: String(tvdbId), fetchedAt: new Date().toISOString() },
          ...(tvmazeData ? [{ provider: 'TVMAZE', externalId: String(tvmazeData.tvmazeId), fetchedAt: new Date().toISOString() }] : []),
          ...(omdbData ? [{ provider: 'OMDB', externalId: imdbId || 'N/A', fetchedAt: new Date().toISOString() }] : []),
        ],

        ageRating: omdbData?.ageRating || null,
        ageRatingGuide: null,
        contentRatings: contentRatings.length > 0 ? contentRatings : null,

        seasons: seasonsArray,
        episodes: episodesList,
        characters: castPayload,
        staff: crewPayload,
      };

      await this.tvRepository.upsertV2Record(payload);

      this.logger.debug(
        `TV V2 upsert complete: "${payload.titlePrimary}" (TVDB: ${tvdbId}) | ${seasonsArray.length} seasons, ${episodesList.length} episodes, ${castPayload.length} cast, ${crewPayload.length} crew`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch TV series ${tvdbId} from TVDB: ${message}`,
      );
      throw new InternalServerErrorException('Failed to fetch TV series from TVDB');
    }
  }
}
