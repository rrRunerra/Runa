import { Injectable, Logger } from '@nestjs/common';
import { StaffRole } from '@runa/database';
import { AnilistService } from 'src/providers/Anilist/anilist.service';
import { AnizipService } from 'src/providers/Anizip/anizip.service';
import { MalService } from 'src/providers/Mal/mal.service';
import { BangumiService } from 'src/providers/Bangumi/bangumi.service';

function mapRelationType(relTypeStr?: string): string {
  if (!relTypeStr) return 'OTHER';
  const upper = relTypeStr.toUpperCase();
  const valid = [
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
  if (valid.includes(upper)) {
    return upper;
  }
  if (upper === 'PARENT') return 'PREQUEL';
  if (upper === 'CHILD') return 'SEQUEL';
  if (upper === 'SOURCE') return 'ADAPTATION';
  return 'OTHER';
}

function mapStaffRole(roleStr?: string): StaffRole {
  if (!roleStr) return StaffRole.OTHER;
  const upper = roleStr.toUpperCase();
  if (upper.includes('STORY') || upper.includes('AUTHOR') || upper.includes('WRITER'))
    return StaffRole.ORIGINAL_CREATOR;
  if (upper.includes('ART') || upper.includes('ILLUSTRATION') || upper.includes('DRAWING'))
    return StaffRole.CHARACTER_DESIGN;
  return StaffRole.OTHER;
}

function parseAgeRating(
  ratingStr?: string | null,
  isAdult?: boolean,
): { ageRating: string | null; ageRatingGuide: string | null } {
  if (isAdult) {
    return { ageRating: 'Rx', ageRatingGuide: 'Adult / Hentai (18+)' };
  }
  if (!ratingStr) {
    return { ageRating: null, ageRatingGuide: null };
  }

  const r = ratingStr.toUpperCase();
  if (r.includes('G') || r.includes('ALL AGES')) {
    return { ageRating: 'G', ageRatingGuide: 'All Ages' };
  }
  if (r.includes('PG-13') || r.includes('TEENS')) {
    return { ageRating: 'PG-13', ageRatingGuide: 'Teens 13 or older' };
  }
  if (r.includes('R-17') || r.includes('17+')) {
    return { ageRating: 'R-17+', ageRatingGuide: 'Violence & Profanity' };
  }
  if (r.includes('R+') || r.includes('MILD NUDITY')) {
    return { ageRating: 'R+', ageRatingGuide: 'Mild Nudity & Violence' };
  }
  if (r.includes('RX') || r.includes('HENTAI')) {
    return { ageRating: 'Rx', ageRatingGuide: 'Explicit Adult Content' };
  }

  return { ageRating: ratingStr, ageRatingGuide: null };
}

@Injectable()
export class MangaExternal {
  private readonly logger = new Logger(MangaExternal.name);

  constructor(
    private readonly anilistService: AnilistService,
    private readonly anizipService: AnizipService,
    private readonly malService: MalService,
    private readonly bangumiService: BangumiService,
  ) {}

  public async fetchFullV2Record(inputParam: string | number): Promise<any | null> {
    try {
      this.logger.debug(`Fetching complete V2 manga record for: "${inputParam}"`);

      // 1. Fetch Paginated AniList Data
      const alData = await this.anilistService.fetchFullManga(inputParam);
      if (!alData) {
        this.logger.warn(`Manga not found on AniList for: "${inputParam}"`);
        return null;
      }

      const anilistId = alData.id;

      // 2. Fetch Cross-Reference Mappings (AniZip)
      const aniZip = await this.anizipService.fetchMappings(anilistId);
      const malId = alData.idMal || aniZip?.malId || null;
      const mangaUpdatesId = aniZip?.mangaUpdatesId ? String(aniZip.mangaUpdatesId) : null;

      // 3. Fetch MAL Data
      const malData = malId ? await this.malService.fetchMalMangaData(malId) : null;

      // 4. Construct Primary & Secondary Titles
      const titlePrimary =
        alData.title?.english ||
        alData.title?.romaji ||
        alData.title?.native ||
        'Untitled';
      const titleSecondary = alData.title?.english
        ? alData.title?.romaji !== alData.title?.english
          ? alData.title?.romaji
          : null
        : null;
      const titleNative = alData.title?.native || null;

      // 5. Build Image Galleries
      const images: any = {
        anilist: {
          cover:
            alData.coverImage?.extraLarge ||
            alData.coverImage?.large ||
            alData.coverImage?.medium ||
            null,
          banner: alData.bannerImage || null,
        },
        mal: {
          pictures: malData?.pictures || [],
        },
      };

      const coverImage =
        alData.coverImage?.extraLarge ||
        alData.coverImage?.large ||
        alData.coverImage?.medium ||
        null;
      const bannerImage = alData.bannerImage || null;

      // 6. Age Rating & Guide
      const { ageRating, ageRatingGuide } = parseAgeRating(
        malData?.rating,
        alData.isAdult,
      );

      // 7. Characters Mapping
      const characters: any[] = [];
      if (alData.allCharacters && Array.isArray(alData.allCharacters)) {
        for (const edge of alData.allCharacters) {
          const charNode = edge.node;
          if (!charNode || !charNode.name) continue;

          const namePrimary =
            charNode.name.full ||
            charNode.name.native ||
            charNode.name.alternative?.[0] ||
            'Unknown Character';

          characters.push({
            anilistId: charNode.id,
            namePrimary,
            nameNative: charNode.name.native || null,
            nameAlternative: charNode.name.alternative || [],
            nameAlternativeSpoiler: charNode.nameAlternativeSpoiler || [],
            image: charNode.image?.large || charNode.image?.medium || null,
            description: charNode.description || null,
            gender: charNode.gender || null,
            age: charNode.age || null,
            bloodType: charNode.bloodType || null,
            dateOfBirthYear: charNode.dateOfBirth?.year || null,
            dateOfBirthMonth: charNode.dateOfBirth?.month || null,
            dateOfBirthDay: charNode.dateOfBirth?.day || null,
            alFavorites: charNode.favourites || null,
            role: edge.role || 'MAIN',
          });
        }
      }

      // 8. Staff Mapping (Authors / Illustrators)
      const staff: any[] = [];
      if (alData.allStaff && Array.isArray(alData.allStaff)) {
        for (const edge of alData.allStaff) {
          const staffNode = edge.node;
          if (!staffNode || !staffNode.name) continue;

          const namePrimary =
            staffNode.name.full ||
            staffNode.name.native ||
            staffNode.name.alternative?.[0] ||
            'Unknown Staff';

          staff.push({
            anilistId: staffNode.id,
            namePrimary,
            nameNative: staffNode.name.native || null,
            nameAlternative: staffNode.name.alternative || [],
            image: staffNode.image?.large || staffNode.image?.medium || null,
            role: mapStaffRole(edge.role),
            customRole: edge.role || null,
          });
        }
      }

      // Add MAL authors to staff if not present
      if (malData?.authors && Array.isArray(malData.authors)) {
        for (const author of malData.authors) {
          if (!author.name) continue;
          const exists = staff.some(
            (s) => s.namePrimary.toLowerCase() === author.name.toLowerCase(),
          );
          if (!exists) {
            staff.push({
              anilistId: null,
              malId: author.malId || null,
              namePrimary: author.name,
              role: mapStaffRole(author.role),
              customRole: author.role || 'Author',
            });
          }
        }
      }

      // 9. Studios / Publishers Mapping
      const studios: any[] = [];
      if (alData.studios?.edges && Array.isArray(alData.studios.edges)) {
        for (const edge of alData.studios.edges) {
          const studioNode = edge.node;
          if (!studioNode || !studioNode.name) continue;
          studios.push({
            anilistId: studioNode.id,
            name: studioNode.name,
            isAnimationStudio: studioNode.isAnimationStudio || false,
            siteUrl: studioNode.siteUrl || null,
            alFavorites: studioNode.favourites || null,
            isMain: edge.isMain || false,
          });
        }
      }

      // 10. Relations Mapping
      const relations: any[] = [];
      if (alData.relations?.edges && Array.isArray(alData.relations.edges)) {
        for (const edge of alData.relations.edges) {
          const relNode = edge.node;
          if (!relNode) continue;
          const targetType = (relNode.type || 'MANGA').toUpperCase();
          relations.push({
            targetAnilistId: relNode.id,
            targetType,
            type: mapRelationType(edge.relationType),
            titlePrimary:
              relNode.title?.english ||
              relNode.title?.romaji ||
              relNode.title?.native ||
              'Unknown',
            format: relNode.format || 'UNKNOWN',
          });
        }
      }

      return {
        anilistId,
        malId,
        mangaUpdatesId,

        titlePrimary,
        titleSecondary,
        titleNative,

        coverImage,
        bannerImage,
        images,

        description: alData.description || null,
        hashtag: alData.hashtag || null,
        countryOfOrigin: alData.countryOfOrigin || null,

        volumeCount: alData.volumes || null,
        chapterCount: alData.chapters || null,

        serialization: malData?.serialization || null,
        imprint: null,
        publishers: studios.map((s) => s.name),
        demographics: [],
        readingDirection: 'RIGHT_TO_LEFT',

        startDateYear: alData.startDate?.year || null,
        startDateMonth: alData.startDate?.month || null,
        startDateDay: alData.startDate?.day || null,

        endDateYear: alData.endDate?.year || null,
        endDateMonth: alData.endDate?.month || null,
        endDateDay: alData.endDate?.day || null,

        genres: alData.genres || [],
        source: alData.source || 'UNKNOWN',
        format: alData.format || 'UNKNOWN',
        status: alData.status || 'UNKNOWN',

        averageScore: null,
        favorites: 0,
        popularity: 0,
        totalScoreSum: null,
        scoredCount: null,

        alAverageScore: alData.averageScore || alData.meanScore || null,
        alFavorites: alData.favourites || null,
        alPopularity: alData.popularity || null,

        malAverageScore: malData?.mean ? Math.round(malData.mean * 10) : null,
        malFavorites: malData?.favorites || null,
        malPopularity: malData?.popularity || null,

        isAdult: alData.isAdult || false,
        synonyms: alData.synonyms || [],

        siteUrl: alData.siteUrl || null,
        externalLinks: alData.externalLinks || [],
        sources: [
          {
            provider: 'ANILIST',
            url: alData.siteUrl || `https://anilist.co/manga/${anilistId}`,
            externalId: String(anilistId),
          },
          ...(malId
            ? [
                {
                  provider: 'MYANIMELIST',
                  url: `https://myanimelist.net/manga/${malId}`,
                  externalId: String(malId),
                },
              ]
            : []),
        ],

        ageRating,
        ageRatingGuide,

        alUpdatedAt: alData.updatedAt || Math.floor(Date.now() / 1000),
        malUpdatedAt: malData ? Math.floor(Date.now() / 1000) : null,

        characters,
        staff,
        studios,
        relations,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch full V2 manga record for "${inputParam}": ${error?.message || error}`,
      );
      return null;
    }
  }

  public async search(title: string): Promise<any[]> {
    try {
      this.logger.debug(`Searching for manga on AniList: "${title}"`);
      const results = await this.anilistService.searchManga(title, 30);

      return results.map((item) => ({
        anilistId: item.id,
        malId: item.idMal || null,
        title: item.title?.english || item.title?.romaji || item.title?.native || 'Untitled',
        secondaryTitle: item.title?.english ? item.title?.romaji : null,
        coverImage: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || null,
        averageScore: item.averageScore || null,
        isAdult: item.isAdult || false,
        format: item.format || 'UNKNOWN',
        status: item.status || 'UNKNOWN',
      }));
    } catch (error: any) {
      this.logger.error(`Failed to search manga on AniList: ${error?.message || error}`);
      return [];
    }
  }
}
