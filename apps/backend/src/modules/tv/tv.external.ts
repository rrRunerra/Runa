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
        const fullRes = await fetch(`https://api.tvmaze.com/shows/${showData.id}?embed[]=episodes&embed[]=cast&embed[]=crew`);
        const fullShow: TvmazeShow = fullRes.ok ? await fullRes.json() : showData;

        let seasons: any[] = [];
        try {
          const sRes = await fetch(`https://api.tvmaze.com/shows/${showData.id}/seasons`);
          if (sRes.ok) seasons = await sRes.json();
        } catch { /* ignore */ }

        return {
          tvmazeId: fullShow.id,
          name: fullShow.name,
          type: fullShow.type,
          language: fullShow.language,
          genres: fullShow.genres || [],
          status: fullShow.status,
          runtime: fullShow.runtime || fullShow.averageRuntime,
          premiered: fullShow.premiered,
          ended: fullShow.ended,
          officialSite: fullShow.officialSite,
          rating: fullShow.rating?.average || null,
          network: fullShow.network?.name || fullShow.webChannel?.name || null,
          networkCountry: fullShow.network?.country?.code || null,
          poster: fullShow.image?.original || fullShow.image?.medium || null,
          summary: fullShow.summary ? fullShow.summary.replace(/<[^>]*>?/gm, '') : null,
          imdbId: fullShow.externals?.imdb || null,
          thetvdbId: fullShow.externals?.thetvdb || null,
          tvrageId: fullShow.externals?.tvrage || null,
          broadcastTime: fullShow.schedule?.time || null,
          broadcastDays: fullShow.schedule?.days || [],
          episodes: fullShow._embedded?.episodes || [],
          seasons,
          cast: fullShow._embedded?.cast || [],
          crew: fullShow._embedded?.crew || [],
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
      // 1. Fetch primary TVDB data
      const [seriesData, transData, episodesData] = await Promise.all([
        this.tvdbFetch<TvdbSeriesResponse>(
          `${this.baseUrl}/series/${tvdbId}/extended`,
        ),
        this.tvdbFetch<TvdbTranslationResponse>(
          `${this.baseUrl}/series/${tvdbId}/translations/eng`,
        ),
        this.tvdbFetch<TvdbEpisodesResponse>(
          `${this.baseUrl}/series/${tvdbId}/episodes/official/eng`,
        ),
      ]);

      if (!seriesData.data) {
        throw new InternalServerErrorException(
          `TV series with TVDB ID ${tvdbId} not found`,
        );
      }

      const series = seriesData.data;
      const translation = transData.data;
      const rawTvdbEpisodes = episodesData.data?.episodes || [];

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

      // Build seasons + episodes (merge TVDB + TVMaze)
      const rawTvmazeEpisodes = tvmazeData?.episodes || [];
      const seasonsMap = new Map<number, any>();
      const episodesList: any[] = [];

      if (rawTvdbEpisodes.length > 0) {
        for (const ep of rawTvdbEpisodes) {
          const sNum = ep.seasonNumber ?? 1;
          const eNum = ep.number ?? 1;

          if (!seasonsMap.has(sNum)) {
            const tvdbSeason = series.seasons?.find((s) => s.number === sNum);
            const tvmazeSeason = tvmazeData?.seasons?.find((s: any) => s.number === sNum);
            const posterImage = tvdbSeason?.image || tvmazeSeason?.image?.original || null;

            seasonsMap.set(sNum, {
              seasonNumber: sNum,
              tvdbSeasonId: tvdbSeason?.id || null,
              tvmazeSeasonId: tvmazeSeason?.id || null,
              titlePrimary: tvdbSeason?.nameTranslations?.find((t: any) => t.language === 'eng')?.name || tvdbSeason?.name || (sNum === 0 ? 'Specials' : `Season ${sNum}`),
              posterImage,
              airDateYear: firstAired.year,
              episodeCount: 0,
            });
          }
          const seasonObj = seasonsMap.get(sNum);
          seasonObj.episodeCount++;

          const tvmazeEp = rawTvmazeEpisodes.find((e: any) => e.season === sNum && e.number === eNum);

          const epName =
            ep.nameTranslations?.find((t) => t.language === 'eng')?.name ||
            ep.name ||
            tvmazeEp?.name ||
            `Episode ${eNum}`;
          const epOverview =
            ep.overviewTranslations?.find((t) => t.language === 'eng')?.overview ||
            ep.overview ||
            (tvmazeEp?.summary ? tvmazeEp.summary.replace(/<[^>]*>?/gm, '') : null);

          episodesList.push({
            seasonNumber: sNum,
            episodeNumber: eNum,
            titlePrimary: epName,
            description: epOverview,
            duration: ep.runtime ? Number(ep.runtime) : (tvmazeEp?.runtime || null),
            airDate: ep.aired || tvmazeEp?.airdate || null,
            airTime: tvmazeEp?.airtime || null,
            airstamp: tvmazeEp?.airstamp || null,
            rating: tvmazeEp?.rating?.average ? Number(tvmazeEp.rating.average) : null,
            episodeType: tvmazeEp?.type || (sNum === 0 ? 'special' : 'regular'),
            thumbnail: ep.image || tvmazeEp?.image?.original || null,
            isFiller: false,
            isRecap: false,
          });
        }
      } else if (rawTvmazeEpisodes.length > 0) {
        for (const ep of rawTvmazeEpisodes) {
          const sNum = ep.season || 1;
          const eNum = ep.number || 1;

          if (!seasonsMap.has(sNum)) {
            const tvmazeSeason = tvmazeData?.seasons?.find((s: any) => s.number === sNum);
            seasonsMap.set(sNum, {
              seasonNumber: sNum,
              tvmazeSeasonId: tvmazeSeason?.id || null,
              titlePrimary: sNum === 0 ? 'Specials' : `Season ${sNum}`,
              posterImage: ep.image?.original || tvmazeSeason?.image?.original || null,
              airDateYear: ep.airdate ? parseInt(ep.airdate.split('-')[0], 10) : null,
              episodeCount: 0,
            });
          }
          const seasonObj = seasonsMap.get(sNum);
          seasonObj.episodeCount++;

          episodesList.push({
            seasonNumber: sNum,
            episodeNumber: eNum,
            titlePrimary: ep.name || `Episode ${eNum}`,
            description: ep.summary ? ep.summary.replace(/<[^>]*>?/gm, '') : null,
            duration: ep.runtime || null,
            airDate: ep.airdate || null,
            airTime: ep.airtime || null,
            airstamp: ep.airstamp || null,
            rating: ep.rating?.average ? Number(ep.rating.average) : null,
            episodeType: ep.type || 'regular',
            thumbnail: ep.image?.original || ep.image?.medium || null,
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
