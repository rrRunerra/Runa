import { Injectable, Logger } from '@nestjs/common';
import { AnilistService } from 'src/providers/Anilist/anilist.service';
import { AnizipService } from 'src/providers/Anizip/anizip.service';
import { MalService } from 'src/providers/Mal/mal.service';
import { TvdbService } from 'src/providers/Tvdb/tvdb.service';
import { BangumiService } from 'src/providers/Bangumi/bangumi.service';
import { AniskipService, AniSkipTimestamps } from 'src/providers/Aniskip/aniskip.service';
import { AnimeSearchEntity } from './anime.entities';
import { AnimeFormat, AnimeStatus, AnimeSource, AnimeSeason, StaffRole } from '@runa/database';
import { PrismaService } from 'src/providers/database/prisma.service';

export function mapStaffRole(roleStr: string): StaffRole {
  if (!roleStr) return StaffRole.OTHER;
  const lower = roleStr.toLowerCase();
  if (lower.includes('chief director')) return StaffRole.DIRECTOR;
  if (lower.includes('episode director')) return StaffRole.EPISODE_DIRECTOR;
  if (lower.includes('director')) return StaffRole.DIRECTOR;
  if (lower.includes('chief animation director'))
    return StaffRole.CHIEF_ANIMATION_DIRECTOR;
  if (lower.includes('character design')) return StaffRole.CHARACTER_DESIGN;
  if (lower.includes('art director')) return StaffRole.ART_DIRECTOR;
  if (lower.includes('music') || lower.includes('composer'))
    return StaffRole.COMPOSER;
  if (lower.includes('sound director')) return StaffRole.SOUND_DIRECTOR;
  if (
    lower.includes('original creator') ||
    lower.includes('original story') ||
    lower.includes('original character')
  )
    return StaffRole.ORIGINAL_CREATOR;
  if (lower.includes('script') || lower.includes('series composition'))
    return StaffRole.SCRIPT;
  if (lower.includes('key animation') || lower.includes('animator'))
    return StaffRole.KEY_ANIMATION;
  if (lower.includes('color design')) return StaffRole.COLOR_DESIGN;
  if (lower.includes('executive producer')) return StaffRole.EXECUTIVE_PRODUCER;
  if (lower.includes('producer')) return StaffRole.PRODUCER;
  return StaffRole.OTHER;
}

export function mapMediaType(typeStr?: string, formatStr?: string): string {
  if (!typeStr && !formatStr) return 'UNKNOWN';
  const typeUpper = typeStr ? typeStr.toUpperCase() : '';
  const formatUpper = formatStr ? formatStr.toUpperCase() : '';

  if (
    typeUpper === 'MANGA' ||
    formatUpper === 'MANGA' ||
    formatUpper === 'NOVEL' ||
    formatUpper === 'ONE_SHOT'
  ) {
    return 'MANGA';
  }
  if (typeUpper === 'ANIME') {
    if (formatUpper === 'MUSIC') return 'MUSIC';
    return 'ANIME';
  }
  if (typeUpper === 'MOVIE' || formatUpper === 'MOVIE') return 'MOVIE';
  if (typeUpper === 'TV') return 'TV';
  if (typeUpper === 'GAME') return 'GAME';
  if (typeUpper === 'BOOK') return 'BOOK';
  if (typeUpper === 'MUSIC') return 'MUSIC';

  return typeUpper || 'UNKNOWN';
}

export function mapRelationType(relTypeStr?: string): string {
  if (!relTypeStr) return 'UNKNOWN';
  const upper = relTypeStr.toUpperCase();
  const validRelationTypes = [
    'PREQUEL',
    'SEQUEL',
    'ADAPTATION',
    'SIDE_STORY',
    'SPIN_OFF',
    'SUMMARY',
    'ALTERNATIVE',
    'CHARACTER',
    'OTHER',
  ];
  if (validRelationTypes.includes(upper)) {
    return upper;
  }
  if (upper === 'PARENT') return 'PREQUEL';
  if (upper === 'CHILD') return 'SEQUEL';
  if (upper === 'SOURCE') return 'ADAPTATION';
  return 'OTHER';
}

export function normalizeNameKey(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join('');
}

export function parseAgeRating(
  ratingStr?: string | null,
  isAdult?: boolean,
): { ageRating: string | null; ageRatingGuide: string | null } {
  if (isAdult) {
    return { ageRating: 'Rx', ageRatingGuide: 'Hentai / Adult' };
  }
  if (!ratingStr) {
    return { ageRating: null, ageRatingGuide: null };
  }

  const raw = ratingStr.trim();

  if (raw.includes(' - ')) {
    const parts = raw.split(' - ');
    const rating = parts[0].trim();
    let guide = parts.slice(1).join(' - ').trim();
    if (guide.startsWith('(') && guide.endsWith(')')) {
      guide = guide.slice(1, -1).trim();
    }
    return { ageRating: rating, ageRatingGuide: guide || null };
  }

  const lower = raw.toLowerCase();
  switch (lower) {
    case 'g':
      return { ageRating: 'G', ageRatingGuide: 'All Ages' };
    case 'pg':
      return { ageRating: 'PG', ageRatingGuide: 'Children' };
    case 'pg_13':
    case 'pg13':
    case 'pg-13':
      return { ageRating: 'PG-13', ageRatingGuide: 'Teens 13 or older' };
    case 'r':
    case 'r_17':
    case 'r-17':
      return { ageRating: 'R-17+', ageRatingGuide: 'Violence & Profanity' };
    case 'r+':
    case 'r_plus':
      return { ageRating: 'R+', ageRatingGuide: 'Mild Nudity' };
    case 'rx':
      return { ageRating: 'Rx', ageRatingGuide: 'Hentai / Adult' };
    default:
      return { ageRating: raw, ageRatingGuide: null };
  }
}

export function findStudioExternalIds(
  studioName: string,
  malStudios?: any[],
  tvdbCompanies?: any[],
) {
  const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameNorm = norm(studioName);

  const malMatch = malStudios?.find((s: any) => {
    const n = norm(s.name);
    return (
      n && nameNorm && (n === nameNorm || n.includes(nameNorm) || nameNorm.includes(n))
    );
  });
  const tvdbMatch = tvdbCompanies?.find((c: any) => {
    const n = norm(c.name);
    return (
      n && nameNorm && (n === nameNorm || n.includes(nameNorm) || nameNorm.includes(n))
    );
  });

  return {
    malId: malMatch ? Number(malMatch.malId) : null,
    tvDBId: tvdbMatch ? Number(tvdbMatch.tvdbId) : null,
  };
}

@Injectable()
export class AnimeExternal {
  private readonly logger = new Logger(AnimeExternal.name);

  constructor(
    private readonly anilistService: AnilistService,
    private readonly anizipService: AnizipService,
    private readonly malService: MalService,
    private readonly tvdbService: TvdbService,
    private readonly bangumiService: BangumiService,
    private readonly aniskipService: AniskipService,
    private readonly prisma: PrismaService,
  ) {}

  public async search(title: string): Promise<AnimeSearchEntity[]> {
    try {
      this.logger.debug(`Searching AniList for anime: "${title}"`);
      const mediaList = await this.anilistService.searchAnime(title, 30);

      const mapped: AnimeSearchEntity[] = [];

      for (const item of mediaList) {
        const primaryTitle =
          item.title?.english || item.title?.romaji || item.title?.native || 'Untitled';
        const secondaryTitle = item.title?.romaji || item.title?.native || null;
        const formatStr = item.format
          ? (item.format.toUpperCase() as AnimeFormat)
          : AnimeFormat.UNKNOWN;
        const statusStr = item.status
          ? (item.status.toUpperCase() as AnimeStatus)
          : AnimeStatus.NOT_YET_RELEASED;

        const anilistId = item.id;
        const existing = await this.prisma.client.aquilaAnimeV2.findUnique({
          where: { anilistId },
          select: { id: true },
        });

        let internalId: number = existing?.id ?? 0;
        if (!internalId) {
          try {
            const created = await this.prisma.client.aquilaAnimeV2.upsert({
              where: { anilistId },
              create: {
                anilistId,
                titlePrimary: primaryTitle,
                titleSecondary: secondaryTitle,
                coverImage: item.coverImage?.extraLarge || item.coverImage?.large || null,
                format: formatStr,
                status: statusStr,
                isAdult: item.isAdult ?? false,
                startDateYear: item.startDate?.year ?? 0,
                seasonYear: item.startDate?.year ?? 0,
                episodeCount: item.episodes ?? null,
              },
              update: {},
              select: { id: true },
            });
            internalId = created.id;
          } catch (e) {
            const raced = await this.prisma.client.aquilaAnimeV2.findUnique({
              where: { anilistId },
              select: { id: true },
            });
            internalId = raced?.id ?? anilistId;
          }
        }

        mapped.push({
          id: internalId,
          title: primaryTitle,
          secondaryTitle,
          coverImage: item.coverImage?.extraLarge || item.coverImage?.large || null,
          averageScore: null,
          isAdult: item.isAdult ?? false,
          format: formatStr,
          status: statusStr,
          seasonYear: item.startDate?.year ?? null,
          episodes: item.episodes ?? null,
        });
      }

      return mapped;
    } catch (err: any) {
      this.logger.error(`External anime search error: ${err.message}`);
      return [];
    }
  }

  public async fetchFullV2Record(inputParam: string | number): Promise<any | null> {
    // 1. Fetch Paginated AniList Data
    const alData = await this.anilistService.fetchFullAnime(inputParam);
    if (!alData) {
      this.logger.warn(`Anime "${inputParam}" not found on AniList`);
      return null;
    }

    const titleStr = alData.title?.english || alData.title?.romaji || alData.title?.native || '';

    // Fetch AniZip mappings first to get accurate TVDB ID and MAL ID hints
    const aniZip = await this.anizipService.fetchMappings(alData.id).catch((err) => {
      this.logger.warn(`AniZip non-blocking error: ${err.message}`);
      return null;
    });

    const malIdHint = alData.idMal || aniZip?.malId;
    const tvdbIdHint = aniZip?.tvdbId;

    // Non-blocking parallel queries to optional secondary sources
    const [malData, tvdbData, bangumiId] = await Promise.all([
      malIdHint
        ? this.malService.fetchMalData(malIdHint).catch((err) => {
            this.logger.warn(`MAL non-blocking error: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),
      this.tvdbService.fetchTvdbData(tvdbIdHint || null, titleStr).catch((err) => {
        this.logger.warn(`TVDB non-blocking error: ${err.message}`);
        return null;
      }),
      this.bangumiService.fetchBangumiId(alData.id, titleStr).catch((err) => {
        this.logger.warn(`Bangumi non-blocking error: ${err.message}`);
        return null;
      }),
    ]);

    const malId = malIdHint || malData?.id || null;
    const anidbId = aniZip?.anidbId || null;
    const tvdbId = tvdbData?.tvdbId || tvdbIdHint || null;

    // Fetch MAL characters/people & Jikan episode titles in parallel if malId exists
    const [malCharsData, jikanEpisodesMap] = await Promise.all([
      malId
        ? this.malService.fetchCharactersAndStaff(malId).catch((err) => {
            this.logger.warn(`MAL characters/staff non-blocking error: ${err.message}`);
            return { malCharacters: [], malPeopleMap: new Map() };
          })
        : Promise.resolve({ malCharacters: [], malPeopleMap: new Map() }),
      malId
        ? this.malService.fetchEpisodes(malId).catch((err) => {
            this.logger.warn(`Jikan episodes non-blocking error: ${err.message}`);
            return {};
          })
        : Promise.resolve({}),
    ]);

    // Theme Songs aggregation
    let openings: string[] = [];
    let endings: string[] = [];
    if (malData?.opening_themes?.length || malData?.ending_themes?.length) {
      openings = (malData.opening_themes || []).map((t: any) => t.text || t.name || String(t));
      endings = (malData.ending_themes || []).map((t: any) => t.text || t.name || String(t));
    } else if (aniZip?.themeSongs) {
      openings = aniZip.themeSongs.openings || [];
      endings = aniZip.themeSongs.endings || [];
    }

    // Age Rating parsing
    const { ageRating, ageRatingGuide } = parseAgeRating(
      malData?.rating,
      alData.isAdult,
    );

    // Episodes & Timestamps fetching in parallel
    const totalEpCount = alData.episodes || 1;

    const skipTimestampsList: (AniSkipTimestamps | null)[] = malId
      ? await Promise.all(
          Array.from({ length: totalEpCount }, (_, i) =>
            this.aniskipService
              .fetchSkipTimestamps(malId, i + 1)
              .catch(() => null),
          ),
        )
      : Array.from({ length: totalEpCount }, () => null);

    const episodeRecords: any[] = [];

    for (let ep = 1; ep <= totalEpCount; ep++) {
      const skip = skipTimestampsList[ep - 1] || null;

      const zipEp = aniZip?.episodes?.[String(ep)] || aniZip?.episodes?.[ep] || null;
      const jikanEp = jikanEpisodesMap[ep] || null;

      const titlePrimary =
        zipEp?.title?.en || jikanEp?.title || zipEp?.title?.['x-jat'] || `Episode ${ep}`;
      const titleSecondary =
        zipEp?.title?.['x-jat'] ||
        jikanEp?.title_romanji ||
        (zipEp?.title?.en ? zipEp?.title?.en : `Episode ${ep}`);
      const titleNative = zipEp?.title?.ja || jikanEp?.title_japanese || `第${ep}話`;
      const description = zipEp?.overview || zipEp?.summary || zipEp?.description || null;
      const thumbnail = zipEp?.image || zipEp?.thumbnail || null;

      let airDate: string | null = null;
      if (zipEp?.airdate) {
        try {
          airDate = new Date(zipEp.airdate).toISOString();
        } catch {}
      } else if (jikanEp?.aired) {
        try {
          airDate = new Date(jikanEp.aired).toISOString();
        } catch {}
      }

      const duration = zipEp?.length || zipEp?.duration || alData.duration || null;

      const zipOpStart =
        typeof zipEp?.aniskip?.op?.start === 'number'
          ? Math.floor(zipEp.aniskip.op.start)
          : typeof zipEp?.aniskip?.op?.startTime === 'number'
            ? Math.floor(zipEp.aniskip.op.startTime)
            : typeof zipEp?.opStart === 'number'
              ? Math.floor(zipEp.opStart)
              : null;
      const zipOpEnd =
        typeof zipEp?.aniskip?.op?.end === 'number'
          ? Math.floor(zipEp.aniskip.op.end)
          : typeof zipEp?.aniskip?.op?.endTime === 'number'
            ? Math.floor(zipEp.aniskip.op.endTime)
            : typeof zipEp?.opEnd === 'number'
              ? Math.floor(zipEp.opEnd)
              : null;

      const zipEdStart =
        typeof zipEp?.aniskip?.ed?.start === 'number'
          ? Math.floor(zipEp.aniskip.ed.start)
          : typeof zipEp?.aniskip?.ed?.startTime === 'number'
            ? Math.floor(zipEp.aniskip.ed.startTime)
            : typeof zipEp?.edStart === 'number'
              ? Math.floor(zipEp.edStart)
              : null;
      const zipEdEnd =
        typeof zipEp?.aniskip?.ed?.end === 'number'
          ? Math.floor(zipEp.aniskip.ed.end)
          : typeof zipEp?.aniskip?.ed?.endTime === 'number'
            ? Math.floor(zipEp.aniskip.ed.endTime)
            : typeof zipEp?.edEnd === 'number'
              ? Math.floor(zipEp.edEnd)
              : null;

      const opStart = skip?.opStart ?? zipOpStart;
      const opEnd = skip?.opEnd ?? zipOpEnd;
      const edStart = skip?.edStart ?? zipEdStart;
      const edEnd = skip?.edEnd ?? zipEdEnd;
      const recapStart = skip?.recapStart ?? null;
      const recapEnd = skip?.recapEnd ?? null;

      episodeRecords.push({
        number: ep,
        type: 'REGULAR',
        titlePrimary,
        titleSecondary,
        titleNative,
        description,
        duration,
        airDate,
        thumbnail,
        isFiller: jikanEp?.filler || false,
        isRecap: jikanEp?.recap || false,
        streamingLinks: null,
        opStart,
        opEnd,
        edStart,
        edEnd,
        recapStart,
        recapEnd,
        skipTimestamps: skip || (opStart !== null || edStart !== null ? { opStart, opEnd, edStart, edEnd, recapStart, recapEnd, source: 'ANIZIP' } : null),
        malEpisodeId: jikanEp?.mal_id || ep,
        anidbEpisodeId: zipEp?.anidbEid || zipEp?.anidb_id || null,
      });
    }

    // Build complete V2 payload
    return {
      anilistId: alData.id,
      malId,
      aniDBId: anidbId,
      tvDBId: tvdbId,
      bangumiId: bangumiId || aniZip?.bangumiId || null,

      titlePrimary: alData.title.english || alData.title.romaji || alData.title.native,
      titleSecondary: alData.title.romaji || null,
      titleNative: alData.title.native || null,

      coverImage: alData.coverImage?.extraLarge || alData.coverImage?.large || null,
      bannerImage: alData.bannerImage || null,
      images: {
        anilist: {
          cover: alData.coverImage,
          banner: alData.bannerImage,
        },
        tvdb: {
          posters: tvdbData?.posters || [],
          banners: tvdbData?.banners || [],
          backgrounds: tvdbData?.backgrounds || [],
        },
        mal: {
          pictures: malData?.pictures || [],
        },
      },

      description: alData.description || null,
      hashtag: alData.hashtag || null,
      countryOfOrigin: alData.countryOfOrigin || null,

      episodeCount: alData.episodes || null,
      episodeDuration: alData.duration || null,

      startDateYear: alData.startDate?.year || 1970,
      startDateMonth: alData.startDate?.month || null,
      startDateDay: alData.startDate?.day || null,

      endDateYear: alData.endDate?.year || null,
      endDateMonth: alData.endDate?.month || null,
      endDateDay: alData.endDate?.day || null,

      genres: alData.genres || [],
      source: (alData.source || 'UNKNOWN').toUpperCase() as AnimeSource,
      format: (alData.format || 'UNKNOWN').toUpperCase() as AnimeFormat,
      status: (alData.status || 'UNKNOWN').toUpperCase() as AnimeStatus,
      seasonSeason: (alData.season || 'UNKNOWN').toUpperCase() as AnimeSeason,
      seasonYear: alData.seasonYear || alData.startDate?.year || 1970,

      averageScore: null,
      favorites: 0,
      popularity: 0,
      totalScoreSum: null,
      scoredCount: null,

      alAverageScore: alData.averageScore || null,
      alFavorites: alData.favourites || null,
      alPopularity: alData.popularity || null,

      malAverageScore: malData?.mean ? Math.round(malData.mean * 100) : null,
      malFavorites: malData?.favorites ?? null,
      malPopularity: malData?.members ?? null,

      ageRating,
      ageRatingGuide,

      isAdult: alData.isAdult || false,
      synonyms: alData.synonyms || [],
      trailers: alData.trailer ? [alData.trailer] : [],
      locked: false,

      siteUrl: alData.siteUrl || null,
      externalLinks: alData.externalLinks || [],
      sources: [
        {
          provider: 'ANILIST',
          externalId: String(alData.id),
          url: alData.siteUrl || `https://anilist.co/anime/${alData.id}`,
          fetchedAt: new Date().toISOString(),
        },
      ],
      themeSongs: { openings, endings },

      nextAiringEpisodeNumber: alData.nextAiringEpisode?.episode || null,
      nextAiringAt: alData.nextAiringEpisode?.airingAt
        ? new Date(alData.nextAiringEpisode.airingAt * 1000)
        : null,

      alUpdatedAt: alData.updatedAt || null,
      malUpdatedAt: malData ? Math.floor(Date.now() / 1000) : null,
      anidbUpdatedAt: aniZip?.anidbId ? Math.floor(Date.now() / 1000) : null,

      episodes: episodeRecords,
      airingSchedule: (alData.allAiringSchedule || []).map((a: any) => ({
        episodeNumber: a.episode,
        airingAt: new Date(a.airingAt * 1000),
        anilistAiringId: a.id,
      })),

      studios: (alData.studios?.edges || []).map((edge: any) => {
        const extIds = findStudioExternalIds(edge.node.name, malData?.studios, tvdbData?.companies);
        return {
          anilistId: edge.node.id,
          malId: extIds.malId,
          tvDBId: extIds.tvDBId,
          name: edge.node.name,
          isAnimationStudio: edge.node.isAnimationStudio || false,
          siteUrl: edge.node.siteUrl || null,
          alFavorites: edge.node.favourites ?? null,
          isMain: edge.isMain || false,
        };
      }),

      characters: (alData.allCharacters || []).map((edge: any) => {
        const charNorm = normalizeNameKey(edge.node.name.full);
        const matchedMalChar = malCharsData.malCharacters.find(
          (c: any) =>
            c.normKey === charNorm ||
            (edge.node.name.alternative &&
              edge.node.name.alternative.some((alt: string) => normalizeNameKey(alt) === c.normKey)),
        );

        const mappedVoiceActors = (edge.voiceActors || []).map((va: any) => {
          const vaNorm = normalizeNameKey(va.name.full);
          const matchedVa = malCharsData.malPeopleMap.get(vaNorm);
          return {
            anilistId: va.id,
            malId: matchedVa ? matchedVa.malId : null,
            namePrimary: va.name.full,
            nameNative: va.name.native || null,
            nameAlternative: va.name.alternative || [],
            image: va.image?.large || null,
            language: va.languageV2 || 'Japanese',
          };
        });

        return {
          anilistId: edge.node.id,
          malId: matchedMalChar ? matchedMalChar.malId : null,
          namePrimary: edge.node.name.full,
          nameNative: edge.node.name.native || null,
          nameAlternative: edge.node.name.alternative || [],
          nameAlternativeSpoiler: edge.node.name.alternativeSpoiler || [],
          image: edge.node.image?.large || null,
          description: edge.node.description || null,
          gender: edge.node.gender || null,
          age: edge.node.age || null,
          bloodType: edge.node.bloodType || null,
          dateOfBirthYear: edge.node.dateOfBirth?.year || null,
          dateOfBirthMonth: edge.node.dateOfBirth?.month || null,
          dateOfBirthDay: edge.node.dateOfBirth?.day || null,
          alFavorites: edge.node.favourites || null,
          role: (edge.role || 'MAIN').toUpperCase(),
          voiceActors: mappedVoiceActors,
        };
      }),

      staff: (alData.allStaff || []).map((edge: any) => {
        const staffNorm = normalizeNameKey(edge.node.name.full);
        const matchedStaff = malCharsData.malPeopleMap.get(staffNorm);
        return {
          anilistId: edge.node.id,
          malId: matchedStaff ? matchedStaff.malId : null,
          namePrimary: edge.node.name.full,
          nameNative: edge.node.name.native || null,
          nameAlternative: edge.node.name.alternative || [],
          image: edge.node.image?.large || null,
          role: mapStaffRole(edge.role),
          customRole: edge.role || null,
        };
      }),

      relations: (alData.relations?.edges || [])
        .map((edge: any) => ({
          targetAnilistId: edge.node.id,
          targetType: mapMediaType(edge.node?.type, edge.node?.format),
          type: mapRelationType(edge.relationType),
          titlePrimary:
            edge.node?.title?.english ||
            edge.node?.title?.romaji ||
            edge.node?.title?.native ||
            'Untitled',
          format: edge.node?.format || null,
        }))
        .filter((rel: any) => rel.type !== 'OTHER'),
    };
  }
}
