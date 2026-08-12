import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { MediaType, RelationType, StaffRole, GameStatus, CharacterRole } from '@runa/database';
import { GameEntity, GameSearchEntity } from './game.entities';
import { rrError } from 'src/providers/error';
import { filterMainGameEntities } from './game.utils';

@Injectable()
export class GameRepository {
  private readonly moduleCode = 'GeRpstry-';
  private readonly logger = new Logger(GameRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async search(queryStr: string): Promise<GameSearchEntity[]> {
    this.logger.debug(`Searching for games: "${queryStr}" in local AquilaGameV2`);
    try {
      const clean = queryStr.trim();
      if (!clean) return [];

      const records = await this.prisma.client.aquilaGameV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: clean, mode: 'insensitive' } },
            { titleSecondary: { contains: clean, mode: 'insensitive' } },
            { titleNative: { contains: clean, mode: 'insensitive' } },
            { developers: { has: clean } },
            { publishers: { has: clean } },
            { synonyms: { has: clean } },
          ],
        },
        take: 30,
        orderBy: { popularity: 'desc' },
      });

      const resultsToReturn = filterMainGameEntities(records, clean);

      return resultsToReturn.map((item) => ({
        id: item.id,
        rawgId: item.rawgId,
        igdbId: item.igdbId,
        steamAppId: item.steamAppId,
        title: item.titlePrimary,
        secondaryTitle: item.titleSecondary || item.titleNative || null,
        coverImage: item.coverImage || null,
        format: 'GAME',
        status: item.status,
        isAdult: item.isAdult,
        averageScore: item.averageScore,
        releaseDateYear: item.releaseDateYear,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to search games from V2 db: ${err?.message || err}`);
      throw new rrError(`${this.moduleCode}FTFAFD001`, {
        message: 'Failed to fetch games from db',
      });
    }
  }

  public async find(id: number | string): Promise<GameEntity | null> {
    const numericId = typeof id === 'number' ? id : Number(id);
    if (isNaN(numericId)) return null;

    const record = await this.prisma.client.aquilaGameV2.findUnique({
      where: { id: numericId },
    });

    if (!record) return null;
    const gameLocalId = record.id;

    const [rawCharacters, rawStudios, rawStaff, rawRelations] = await Promise.all([
      this.prisma.client.aquilaMediaCharacterV2.findMany({
        where: { mediaType: MediaType.GAME, mediaId: gameLocalId },
        include: { character: true, actor: true },
        orderBy: { role: 'asc' },
      }),
      this.prisma.client.aquilaMediaStudioV2.findMany({
        where: { mediaType: MediaType.GAME, mediaId: gameLocalId },
        include: { studio: true },
      }),
      this.prisma.client.aquilaMediaStaffV2.findMany({
        where: { mediaType: MediaType.GAME, mediaId: gameLocalId },
        include: { staff: true },
      }),
      this.prisma.client.aquilaMediaRelationV2.findMany({
        where: { sourceType: MediaType.GAME, sourceId: gameLocalId },
      }),
    ]);

    const relations: any[] = [];
    for (const rel of rawRelations) {
      let targetDetails: any = null;
      if (rel.targetType === MediaType.ANIME) {
        targetDetails = await this.prisma.client.aquilaAnimeV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, format: true, status: true },
        });
      } else if (rel.targetType === MediaType.MANGA) {
        targetDetails = await this.prisma.client.aquilaMangaV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, format: true, status: true },
        });
      } else if (rel.targetType === MediaType.MOVIE) {
        targetDetails = await this.prisma.client.aquilaMovieV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, status: true },
        });
      } else if (rel.targetType === MediaType.BOOK) {
        targetDetails = await this.prisma.client.aquilaBookV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, status: true },
        });
      } else if (rel.targetType === MediaType.GAME) {
        targetDetails = await this.prisma.client.aquilaGameV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, status: true },
        });
      }

      relations.push({
        id: rel.id,
        type: rel.type,
        targetType: rel.targetType,
        targetId: rel.targetId,
        titlePrimary: targetDetails?.titlePrimary || 'Unknown',
        coverImage: targetDetails?.coverImage || null,
        format: targetDetails?.format || 'GAME',
        status: targetDetails?.status || 'RELEASED',
      });
    }

    return {
      id: record.id,
      rawgId: record.rawgId,
      igdbId: record.igdbId,
      steamAppId: record.steamAppId,
      giantbombId: record.giantbombId,
      vndbId: record.vndbId,

      titlePrimary: record.titlePrimary,
      titleSecondary: record.titleSecondary,
      titleNative: record.titleNative,
      slug: record.slug,
      tagline: record.tagline,

      coverImage: record.coverImage,
      bannerImage: record.bannerImage,
      backgroundImage: record.backgroundImage,
      images: record.images,

      description: record.description,
      originalLanguage: record.originalLanguage,
      countryOfOrigin: record.countryOfOrigin,
      website: record.website,
      siteUrl: record.siteUrl,

      releaseDateYear: record.releaseDateYear,
      releaseDateMonth: record.releaseDateMonth,
      releaseDateDay: record.releaseDateDay,
      releaseDate: record.releaseDate,

      genres: record.genres,
      tags: record.tags,
      platforms: record.platforms,
      developers: record.developers,
      publishers: record.publishers,
      franchise: record.franchise,
      gameModes: record.gameModes,
      playerPerspectives: record.playerPerspectives,
      status: record.status,
      isAdult: record.isAdult,
      synonyms: record.synonyms,
      trailers: record.trailers,
      locked: record.locked,

      averageScore: record.averageScore,
      metacriticScore: record.metacriticScore,
      metacriticUserScore: record.metacriticUserScore,
      rawgRating: record.rawgRating,
      rawgRatingsCount: record.rawgRatingsCount,
      igdbRating: record.igdbRating,
      igdbRatingCount: record.igdbRatingCount,
      steamRating: record.steamRating,
      steamPositivePercent: record.steamPositivePercent,

      hltbMainStory: record.hltbMainStory,
      hltbExtraStory: record.hltbExtraStory,
      hltbCompletionist: record.hltbCompletionist,

      requirements: record.requirements,
      languages: record.languages,
      controllerSupport: record.controllerSupport,
      achievements: record.achievements,

      favorites: record.favorites,
      popularity: record.popularity,
      totalScoreSum: record.totalScoreSum,
      scoredCount: record.scoredCount,
      statusDistribution: (record.statusDistribution as Record<string, number>) || {},
      scoreDistribution: (record.scoreDistribution as Record<string, number>) || {},

      averagePlaytime: record.averagePlaytime,
      totalPlaytimeSum: record.totalPlaytimeSum,
      playtimeCount: record.playtimeCount,

      sources: record.sources,

      esrbRating: record.esrbRating,
      pegiRating: record.pegiRating,
      ageRating: record.ageRating,
      ageRatingGuide: record.ageRatingGuide,
      contentRatings: record.contentRatings,

      rawgUpdatedAt: record.rawgUpdatedAt,
      igdbUpdatedAt: record.igdbUpdatedAt,
      steamUpdatedAt: record.steamUpdatedAt,

      createdAt: record.createdAt,
      updatedAt: record.updatedAt,

      characters: rawCharacters.map((c) => ({
        id: c.id,
        characterId: c.characterId,
        namePrimary: c.character.namePrimary,
        nameNative: c.character.nameNative,
        image: c.character.image || c.actor?.image || null,
        role: c.role,
        actor: c.actor
          ? {
              id: c.actor.id,
              namePrimary: c.actor.namePrimary,
              nameNative: c.actor.nameNative,
              image: c.actor.image,
            }
          : null,
      })),

      studios: rawStudios.map((s) => ({
        id: s.studio.id,
        name: s.studio.name,
        isMain: s.isMain,
      })),

      staff: rawStaff.map((st) => ({
        id: st.id,
        actor: {
          id: st.staff.id,
          namePrimary: st.staff.namePrimary,
          nameNative: st.staff.nameNative,
          image: st.staff.image,
          role: st.role,
        },
        role: st.role,
        customRole: st.customRole,
      })),

      relations,
    };
  }

  public async findByIgdbId(igdbId: number): Promise<any> {
    return this.prisma.client.aquilaGameV2.findUnique({
      where: { igdbId },
      select: {
        id: true,
        igdbId: true,
        rawgId: true,
        titlePrimary: true,
        coverImage: true,
        locked: true,
        igdbUpdatedAt: true,
      },
    });
  }

  public async findByRawgId(rawgId: number): Promise<any> {
    return this.prisma.client.aquilaGameV2.findUnique({
      where: { rawgId },
      select: {
        id: true,
        igdbId: true,
        rawgId: true,
        titlePrimary: true,
        coverImage: true,
        locked: true,
        rawgUpdatedAt: true,
      },
    });
  }

  public async upsertV2Record(payload: any, targetInternalId?: number): Promise<any> {
    const igdbId = payload.igdbId;
    const rawgId = payload.rawgId;

    if (!igdbId && !rawgId && !targetInternalId) {
      throw new rrError(`${this.moduleCode}NOEXTID001`, {
        message: 'Cannot upsert AquilaGameV2 without external ID or target ID',
      });
    }

    let existing: any = null;
    const selectFields = {
      id: true,
      locked: true,
      igdbId: true,
      rawgId: true,
      steamAppId: true,
      giantbombId: true,
      vndbId: true,
    };

    if (targetInternalId) {
      existing = await this.prisma.client.aquilaGameV2.findUnique({
        where: { id: targetInternalId },
        select: selectFields,
      });
    }
    if (!existing && igdbId) {
      existing = await this.prisma.client.aquilaGameV2.findUnique({
        where: { igdbId },
        select: selectFields,
      });
    }
    if (!existing && rawgId) {
      existing = await this.prisma.client.aquilaGameV2.findUnique({
        where: { rawgId },
        select: selectFields,
      });
    }
    if (!existing && payload.steamAppId) {
      existing = await this.prisma.client.aquilaGameV2.findUnique({
        where: { steamAppId: payload.steamAppId },
        select: selectFields,
      });
    }
    if (!existing && payload.giantbombId) {
      existing = await this.prisma.client.aquilaGameV2.findUnique({
        where: { giantbombId: payload.giantbombId },
        select: selectFields,
      });
    }
    if (!existing && payload.vndbId) {
      existing = await this.prisma.client.aquilaGameV2.findUnique({
        where: { vndbId: payload.vndbId },
        select: selectFields,
      });
    }

    if (existing?.locked) {
      this.logger.debug(`Game with ID ${existing.id} is locked, skipping upsert`);
      return existing;
    }

    // Helper to check for external ID collisions with OTHER records in DB
    const sanitizeExternalId = async (
      field: 'igdbId' | 'rawgId' | 'steamAppId' | 'giantbombId' | 'vndbId',
      val: any,
    ): Promise<any> => {
      if (val === undefined || val === null) return existing ? (existing[field] ?? null) : null;
      const collision = await this.prisma.client.aquilaGameV2.findFirst({
        where: {
          [field]: val,
          ...(existing ? { NOT: { id: existing.id } } : {}),
        },
        select: { id: true },
      });
      if (collision) {
        this.logger.warn(
          `[GameRepository] Unique constraint collision: ${field}=${val} is already assigned to AquilaGameV2 ID ${collision.id}. Omitting ${field} for target ID ${existing?.id ?? 'new'}.`,
        );
        return existing ? (existing[field] ?? null) : null;
      }
      return val;
    };

    const igdbIdToUse = await sanitizeExternalId('igdbId', payload.igdbId);
    const rawgIdToUse = await sanitizeExternalId('rawgId', payload.rawgId);
    const steamAppIdToUse = await sanitizeExternalId('steamAppId', payload.steamAppId);
    const giantbombIdToUse = await sanitizeExternalId('giantbombId', payload.giantbombId);
    const vndbIdToUse = await sanitizeExternalId('vndbId', payload.vndbId);

    let statusEnum: GameStatus = GameStatus.RELEASED;
    if (payload.status && payload.status in GameStatus) {
      statusEnum = payload.status as GameStatus;
    }

    const whereClause = existing
      ? { id: existing.id }
      : igdbIdToUse
        ? { igdbId: igdbIdToUse }
        : rawgIdToUse
          ? { rawgId: rawgIdToUse }
          : steamAppIdToUse
            ? { steamAppId: steamAppIdToUse }
            : { id: 0 };

    const dbRecord = await this.prisma.client.aquilaGameV2.upsert({
      where: whereClause,
      update: {
        igdbId: igdbIdToUse,
        steamAppId: steamAppIdToUse,
        giantbombId: giantbombIdToUse,
        vndbId: vndbIdToUse,
        rawgId: rawgIdToUse,

        titlePrimary: payload.titlePrimary,
        titleSecondary: payload.titleSecondary ?? null,
        titleNative: payload.titleNative ?? null,
        slug: payload.slug ?? null,
        tagline: payload.tagline ?? null,

        coverImage: payload.coverImage ?? null,
        bannerImage: payload.bannerImage ?? null,
        backgroundImage: payload.backgroundImage ?? null,
        images: payload.images ?? null,

        description: payload.description ?? null,
        originalLanguage: payload.originalLanguage ?? null,
        countryOfOrigin: payload.countryOfOrigin ?? null,
        website: payload.website ?? null,
        siteUrl: payload.siteUrl ?? null,

        releaseDateYear: payload.releaseDateYear ?? null,
        releaseDateMonth: payload.releaseDateMonth ?? null,
        releaseDateDay: payload.releaseDateDay ?? null,
        releaseDate: payload.releaseDate ?? null,

        genres: payload.genres ?? [],
        tags: payload.tags ?? [],
        platforms: payload.platforms ?? [],
        developers: payload.developers ?? [],
        publishers: payload.publishers ?? [],
        franchise: payload.franchise ?? null,
        gameModes: payload.gameModes ?? [],
        playerPerspectives: payload.playerPerspectives ?? [],
        status: statusEnum,
        isAdult: payload.isAdult ?? false,
        synonyms: payload.synonyms ?? [],
        trailers: payload.trailers ?? null,

        requirements: payload.requirements ?? null,
        languages: payload.languages ?? [],
        controllerSupport: payload.controllerSupport ?? null,
        achievements: payload.achievements ?? null,

        metacriticScore: payload.metacriticScore ?? null,
        metacriticUserScore: payload.metacriticUserScore ?? null,
        rawgRating: payload.rawgRating ?? null,
        rawgRatingsCount: payload.rawgRatingsCount ?? null,
        igdbRating: payload.igdbRating ?? null,
        igdbRatingCount: payload.igdbRatingCount ?? null,
        steamRating: payload.steamRating ?? null,
        steamPositivePercent: payload.steamPositivePercent ?? null,

        hltbMainStory: payload.hltbMainStory ?? null,
        hltbExtraStory: payload.hltbExtraStory ?? null,
        hltbCompletionist: payload.hltbCompletionist ?? null,

        sources: payload.sources ?? null,

        esrbRating: payload.esrbRating ?? null,
        pegiRating: payload.pegiRating ?? null,
        ageRating: payload.ageRating ?? null,
        ageRatingGuide: payload.ageRatingGuide ?? null,
        contentRatings: payload.contentRatings ?? null,

        rawgUpdatedAt: payload.rawgUpdatedAt ?? null,
        igdbUpdatedAt: Math.floor(Date.now() / 1000),
      },
      create: {
        rawgId: rawgIdToUse,
        igdbId: igdbIdToUse,
        steamAppId: steamAppIdToUse,
        giantbombId: giantbombIdToUse,
        vndbId: vndbIdToUse,

        titlePrimary: payload.titlePrimary,
        titleSecondary: payload.titleSecondary ?? null,
        titleNative: payload.titleNative ?? null,
        slug: payload.slug ?? null,
        tagline: payload.tagline ?? null,

        coverImage: payload.coverImage ?? null,
        bannerImage: payload.bannerImage ?? null,
        backgroundImage: payload.backgroundImage ?? null,
        images: payload.images ?? null,

        description: payload.description ?? null,
        originalLanguage: payload.originalLanguage ?? null,
        countryOfOrigin: payload.countryOfOrigin ?? null,
        website: payload.website ?? null,
        siteUrl: payload.siteUrl ?? null,

        releaseDateYear: payload.releaseDateYear ?? null,
        releaseDateMonth: payload.releaseDateMonth ?? null,
        releaseDateDay: payload.releaseDateDay ?? null,
        releaseDate: payload.releaseDate ?? null,

        genres: payload.genres ?? [],
        tags: payload.tags ?? [],
        platforms: payload.platforms ?? [],
        developers: payload.developers ?? [],
        publishers: payload.publishers ?? [],
        franchise: payload.franchise ?? null,
        gameModes: payload.gameModes ?? [],
        playerPerspectives: payload.playerPerspectives ?? [],
        status: statusEnum,
        isAdult: payload.isAdult ?? false,
        synonyms: payload.synonyms ?? [],
        trailers: payload.trailers ?? null,

        requirements: payload.requirements ?? null,
        languages: payload.languages ?? [],
        controllerSupport: payload.controllerSupport ?? null,
        achievements: payload.achievements ?? null,

        metacriticScore: payload.metacriticScore ?? null,
        metacriticUserScore: payload.metacriticUserScore ?? null,
        rawgRating: payload.rawgRating ?? null,
        rawgRatingsCount: payload.rawgRatingsCount ?? null,
        igdbRating: payload.igdbRating ?? null,
        igdbRatingCount: payload.igdbRatingCount ?? null,
        steamRating: payload.steamRating ?? null,
        steamPositivePercent: payload.steamPositivePercent ?? null,

        hltbMainStory: payload.hltbMainStory ?? null,
        hltbExtraStory: payload.hltbExtraStory ?? null,
        hltbCompletionist: payload.hltbCompletionist ?? null,

        favorites: 0,
        popularity: 0,
        totalScoreSum: null,
        scoredCount: null,
        statusDistribution: {},
        scoreDistribution: {},

        sources: payload.sources ?? null,

        esrbRating: payload.esrbRating ?? null,
        pegiRating: payload.pegiRating ?? null,
        ageRating: payload.ageRating ?? null,
        ageRatingGuide: payload.ageRatingGuide ?? null,
        contentRatings: payload.contentRatings ?? null,

        rawgUpdatedAt: payload.rawgUpdatedAt ?? null,
        igdbUpdatedAt: Math.floor(Date.now() / 1000),
      },
    });

    const gameLocalId = dbRecord.id;

    // Save Studios (Developers & Publishers)
    const allStudiosList = [
      ...(payload.developers || []),
      ...(payload.publishers || []),
    ];
    for (const devName of allStudiosList) {
      if (!devName) continue;
      let studioObj = await this.prisma.client.aquilaStudioV2.findFirst({
        where: { name: devName },
      });
      if (!studioObj) {
        try {
          studioObj = await this.prisma.client.aquilaStudioV2.create({
            data: { name: devName },
          });
        } catch {
          studioObj = await this.prisma.client.aquilaStudioV2.findFirst({
            where: { name: devName },
          });
        }
      }
      if (studioObj) {
        const existingMediaStudio = await this.prisma.client.aquilaMediaStudioV2.findUnique({
          where: {
            mediaType_mediaId_studioId: {
              mediaType: MediaType.GAME,
              mediaId: gameLocalId,
              studioId: studioObj.id,
            },
          },
        });
        if (!existingMediaStudio) {
          await this.prisma.client.aquilaMediaStudioV2.create({
            data: {
              mediaType: MediaType.GAME,
              mediaId: gameLocalId,
              studioId: studioObj.id,
              isMain: true,
            },
          });
        }
      }
    }

    // Save Staff (Developers / Team members)
    if (payload.staff && Array.isArray(payload.staff)) {
      for (const st of payload.staff) {
        if (!st.namePrimary) continue;
        let actorObj = await this.prisma.client.aquilaActorV2.findFirst({
          where: { namePrimary: st.namePrimary },
        });
        if (!actorObj) {
          actorObj = await this.prisma.client.aquilaActorV2.create({
            data: {
              namePrimary: st.namePrimary,
              image: st.image || null,
            },
          });
        }

        const roleEnum = st.role in StaffRole ? (st.role as StaffRole) : StaffRole.OTHER;
        const existingMediaStaff = await this.prisma.client.aquilaMediaStaffV2.findFirst({
          where: {
            mediaType: MediaType.GAME,
            mediaId: gameLocalId,
            staffId: actorObj.id,
            role: roleEnum,
          },
        });

        if (!existingMediaStaff) {
          await this.prisma.client.aquilaMediaStaffV2.create({
            data: {
              mediaType: MediaType.GAME,
              mediaId: gameLocalId,
              staffId: actorObj.id,
              role: roleEnum,
              customRole: st.customRole || null,
            },
          });
        }
      }
    }

    // Save Characters (Wikidata / AniList)
    if (payload.characters && Array.isArray(payload.characters)) {
      for (const c of payload.characters) {
        const itemChar = c.character || c;
        if (!itemChar.namePrimary) continue;

        let charObj = await this.prisma.client.aquilaCharacterV2.findFirst({
          where: { namePrimary: itemChar.namePrimary },
        });
        if (!charObj) {
          charObj = await this.prisma.client.aquilaCharacterV2.create({
            data: {
              namePrimary: itemChar.namePrimary,
              nameNative: itemChar.nameNative || null,
              image: itemChar.image || null,
              description: itemChar.description || null,
              gender: itemChar.gender || null,
            },
          });
        }

        const validRoles = ['MAIN', 'SUPPORTING', 'BACKGROUND'];
        const uppercaseRole = c.role ? String(c.role).toUpperCase() : '';
        const charRole = validRoles.includes(uppercaseRole)
          ? (uppercaseRole as CharacterRole)
          : CharacterRole.MAIN;

        const existingMediaChar = await this.prisma.client.aquilaMediaCharacterV2.findFirst({
          where: {
            mediaType: MediaType.GAME,
            mediaId: gameLocalId,
            characterId: charObj.id,
          },
        });

        if (!existingMediaChar) {
          await this.prisma.client.aquilaMediaCharacterV2.create({
            data: {
              mediaType: MediaType.GAME,
              mediaId: gameLocalId,
              gameId: gameLocalId,
              characterId: charObj.id,
              role: charRole,
              order: c.order || null,
            },
          });
        }
      }
    }

    // Save Relations (Game Series)
    if (payload.relations && Array.isArray(payload.relations)) {
      for (const rel of payload.relations) {
        if (!rel.targetRawgId && !rel.targetId) continue;
        let targetId: number | null = null;
        const targetTypeStr = (rel.targetType || 'GAME').toUpperCase();
        const targetType = (
          targetTypeStr in MediaType ? targetTypeStr : 'GAME'
        ) as MediaType;

        if (targetType === MediaType.GAME && rel.targetRawgId) {
          let targetRecord = await this.prisma.client.aquilaGameV2.findUnique({
            where: { rawgId: rel.targetRawgId },
            select: { id: true },
          });
          if (!targetRecord) {
            try {
              targetRecord = await this.prisma.client.aquilaGameV2.create({
                data: {
                  rawgId: rel.targetRawgId,
                  titlePrimary: rel.titlePrimary || 'Unknown',
                  coverImage: rel.coverImage || null,
                },
                select: { id: true },
              });
            } catch {
              targetRecord = await this.prisma.client.aquilaGameV2.findUnique({
                where: { rawgId: rel.targetRawgId },
                select: { id: true },
              });
            }
          }
          if (targetRecord) targetId = targetRecord.id;
        }

        if (targetId) {
          const validTypes = [
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
          const relTypeStr = (rel.type || 'OTHER').toUpperCase();
          const relType = validTypes.includes(relTypeStr)
            ? (relTypeStr as RelationType)
            : RelationType.OTHER;

          const existingRel = await this.prisma.client.aquilaMediaRelationV2.findFirst({
            where: {
              sourceType: MediaType.GAME,
              sourceId: gameLocalId,
              targetType,
              targetId,
              type: relType,
            },
          });
          if (!existingRel) {
            await this.prisma.client.aquilaMediaRelationV2.create({
              data: {
                sourceType: MediaType.GAME,
                sourceId: gameLocalId,
                targetType,
                targetId,
                type: relType,
              },
            });
          }
        }
      }
    }

    return dbRecord;
  }

  public async findSimilar(id: any): Promise<any[]> {
    const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(numericId)) return [];

    try {
      const target = await this.prisma.client.aquilaGameV2.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          titlePrimary: true,
          genres: true,
          tags: true,
        },
      });

      if (!target) return [];

      const targetTitle = target.titlePrimary || '';
      const firstWord = targetTitle
        .trim()
        .split(/\s+/)[0]
        ?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const titleKey = firstWord && firstWord.length >= 2 ? firstWord : null;

      const whereConditions: any[] = [];
      if (target.genres && target.genres.length > 0) {
        whereConditions.push({ genres: { hasSome: target.genres } });
      }
      if (target.tags && target.tags.length > 0) {
        whereConditions.push({ tags: { hasSome: target.tags } });
      }
      if (titleKey) {
        whereConditions.push({ titlePrimary: { contains: titleKey, mode: 'insensitive' } });
      }

      const candidates = await this.prisma.client.aquilaGameV2.findMany({
        where: {
          id: { not: numericId },
          ...(whereConditions.length > 0 ? { OR: whereConditions } : {}),
        },
        select: {
          id: true,
          titlePrimary: true,
          titleSecondary: true,
          coverImage: true,
          genres: true,
        },
        take: 40,
      });

      if (candidates.length < 6) {
        const fallback = await this.prisma.client.aquilaGameV2.findMany({
          where: { id: { not: numericId } },
          select: {
            id: true,
            titlePrimary: true,
            titleSecondary: true,
            coverImage: true,
            genres: true,
          },
          take: 12,
        });

        const existingIds = new Set(candidates.map((c) => c.id));
        for (const fb of fallback) {
          if (!existingIds.has(fb.id)) {
            candidates.push(fb);
          }
        }
      }

      const scored = candidates.map((item) => {
        let score = 0;
        const itemTitle = (item.titlePrimary || '').toLowerCase();
        if (titleKey && itemTitle.includes(titleKey.toLowerCase())) {
          score += 10;
        }
        if (target.genres && item.genres) {
          const overlap = item.genres.filter((g) => target.genres.includes(g)).length;
          score += overlap * 3;
        }
        return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, 12).map(({ item }) => ({
        id: item.id,
        title: item.titlePrimary,
        coverImage: item.coverImage || null,
        type: 'GAME',
      }));
    } catch (err) {
      this.logger.error(`Game findSimilar error: ${err}`);
      return [];
    }
  }
}
