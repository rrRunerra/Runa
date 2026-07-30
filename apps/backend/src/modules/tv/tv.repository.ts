import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { MediaType, TvStatus, CharacterRole, StaffRole, RelationType } from '@runa/database';
import { TvEntity, TvSearchEntity } from './tv.entities';

@Injectable()
export class TvRepository {
  private readonly moduleCode = 'TvRpstry-';
  private readonly logger = new Logger(TvRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async search(name: string): Promise<TvSearchEntity[]> {
    this.logger.debug(`Searching for TV series: "${name}" in local AquilaTvV2`);
    try {
      const clean = name.trim();
      if (!clean) return [];

      const records = await this.prisma.client.aquilaTvV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: clean, mode: 'insensitive' } },
            { titleSecondary: { contains: clean, mode: 'insensitive' } },
            { titleNative: { contains: clean, mode: 'insensitive' } },
            { synonyms: { has: clean } },
          ],
        },
        take: 30,
        orderBy: { popularity: 'desc' },
      });

      return records.map((item) => ({
        id: item.id,
        tvDBId: item.tvDBId,
        tmdbId: item.tmdbId,
        imdbId: item.imdbId,
        tvmazeId: item.tvmazeId,
        title: item.titlePrimary,
        secondaryTitle: item.titleSecondary || item.titleNative || null,
        coverImage: item.coverImage || null,
        format: item.showType || 'TV',
        status: item.status,
        isAdult: item.isAdult,
        averageScore: item.averageScore,
        firstAiredYear: item.firstAiredYear,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to search TV from V2 db: ${err?.message || err}`);
      throw new InternalServerErrorException('Failed to fetch TV series from db');
    }
  }

  public async find(id: number | string): Promise<TvEntity | null> {
    const numericId = typeof id === 'number' ? id : Number(id);
    let record: any = null;

    if (!isNaN(numericId)) {
      record = await this.prisma.client.aquilaTvV2.findUnique({
        where: { id: numericId },
        include: {
          seasons: { orderBy: { seasonNumber: 'asc' } },
          episodes: { orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }] },
        },
      });
      if (!record) {
        record = await this.prisma.client.aquilaTvV2.findUnique({
          where: { tvDBId: numericId },
          include: {
            seasons: { orderBy: { seasonNumber: 'asc' } },
            episodes: { orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }] },
          },
        });
      }
    }

    if (!record) return null;
    const tvLocalId = record.id;

    const [rawCharacters, rawStudios, rawStaff, rawRelations] = await Promise.all([
      this.prisma.client.aquilaMediaCharacterV2.findMany({
        where: { mediaType: MediaType.TV, mediaId: tvLocalId },
        include: { character: true, actor: true },
        orderBy: { role: 'asc' },
      }),
      this.prisma.client.aquilaMediaStudioV2.findMany({
        where: { mediaType: MediaType.TV, mediaId: tvLocalId },
        include: { studio: true },
      }),
      this.prisma.client.aquilaMediaStaffV2.findMany({
        where: { mediaType: MediaType.TV, mediaId: tvLocalId },
        include: { staff: true },
      }),
      this.prisma.client.aquilaMediaRelationV2.findMany({
        where: { sourceType: MediaType.TV, sourceId: tvLocalId },
      }),
    ]);

    const relations: any[] = [];
    for (const rel of rawRelations) {
      let targetDetails: any = null;
      if (rel.targetType === MediaType.TV) {
        targetDetails = await this.prisma.client.aquilaTvV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, showType: true, status: true },
        });
      } else if (rel.targetType === MediaType.ANIME) {
        targetDetails = await this.prisma.client.aquilaAnimeV2.findUnique({
          where: { id: rel.targetId },
          select: { titlePrimary: true, coverImage: true, format: true, status: true },
        });
      } else if (rel.targetType === MediaType.MOVIE) {
        targetDetails = await this.prisma.client.aquilaMovieV2.findUnique({
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
        format: targetDetails?.format || targetDetails?.showType || 'TV',
        status: targetDetails?.status || 'UNKNOWN',
      });
    }

    return {
      id: record.id,
      tvDBId: record.tvDBId,
      imdbId: record.imdbId,
      tmdbId: record.tmdbId,
      traktId: record.traktId,
      tvmazeId: record.tvmazeId,
      tvrageId: record.tvrageId,

      titlePrimary: record.titlePrimary,
      titleSecondary: record.titleSecondary,
      titleNative: record.titleNative,
      tagline: record.tagline,

      coverImage: record.coverImage,
      bannerImage: record.bannerImage,
      images: record.images,

      description: record.description,
      originalLanguage: record.originalLanguage,
      countryOfOrigin: record.countryOfOrigin,
      episodeCount: record.episodeCount,
      seasonCount: record.seasonCount,
      averageRuntime: record.averageRuntime,
      homepage: record.homepage,
      siteUrl: record.siteUrl,
      showType: record.showType,

      broadcastTime: record.broadcastTime,
      broadcastDays: record.broadcastDays,

      firstAiredYear: record.firstAiredYear,
      firstAiredMonth: record.firstAiredMonth,
      firstAiredDay: record.firstAiredDay,

      lastAiredYear: record.lastAiredYear,
      lastAiredMonth: record.lastAiredMonth,
      lastAiredDay: record.lastAiredDay,

      genres: record.genres,
      tags: record.tags,
      networks: record.networks,
      studios: record.studios,

      status: record.status,
      isAdult: record.isAdult,
      synonyms: record.synonyms,
      trailers: record.trailers,
      locked: record.locked,

      averageScore: record.averageScore,
      imdbRating: record.imdbRating,
      imdbVotes: record.imdbVotes,
      tvmazeRating: record.tvmazeRating,
      rottenTomatoesScore: record.rottenTomatoesScore,
      awards: record.awards,

      favorites: record.favorites,
      popularity: record.popularity,
      totalScoreSum: record.totalScoreSum,
      scoredCount: record.scoredCount,
      statusDistribution: (record.statusDistribution as Record<string, number>) || {},
      scoreDistribution: (record.scoreDistribution as Record<string, number>) || {},

      sources: record.sources,

      ageRating: record.ageRating,
      ageRatingGuide: record.ageRatingGuide,
      contentRatings: record.contentRatings,

      imdbUpdatedAt: record.imdbUpdatedAt,
      tvdbUpdatedAt: record.tvdbUpdatedAt,
      tvmazeUpdatedAt: record.tvmazeUpdatedAt,

      createdAt: record.createdAt,
      updatedAt: record.updatedAt,

      seasons: record.seasons?.map((s: any) => ({
        id: s.id,
        seasonNumber: s.seasonNumber,
        titlePrimary: s.titlePrimary,
        titleSecondary: s.titleSecondary,
        description: s.description,
        posterImage: s.posterImage,
        airDateYear: s.airDateYear,
        airDateMonth: s.airDateMonth,
        airDateDay: s.airDateDay,
        episodeCount: s.episodeCount,
      })) || [],

      episodes: record.episodes?.map((ep: any) => ({
        id: ep.id,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        titlePrimary: ep.titlePrimary,
        titleSecondary: ep.titleSecondary,
        description: ep.description,
        duration: ep.duration,
        airDate: ep.airDate,
        rating: ep.rating,
        episodeType: ep.episodeType,
        thumbnail: ep.thumbnail,
        isFiller: ep.isFiller,
        isRecap: ep.isRecap,
      })) || [],

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

      studiosList: rawStudios.map((s) => ({
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

  public async findByTvdbId(tvdbId: number): Promise<any> {
    return this.prisma.client.aquilaTvV2.findUnique({
      where: { tvDBId: tvdbId },
      select: {
        id: true,
        tvDBId: true,
        titlePrimary: true,
        titleSecondary: true,
        coverImage: true,
        locked: true,
        tvdbUpdatedAt: true,
      },
    });
  }

  public async findByTvmazeId(tvmazeId: number): Promise<any> {
    return this.prisma.client.aquilaTvV2.findUnique({
      where: { tvmazeId },
      select: {
        id: true,
        tvDBId: true,
        titlePrimary: true,
        coverImage: true,
        locked: true,
      },
    });
  }

  public async upsertV2Record(payload: any): Promise<any> {
    const tvdbId = payload.tvDBId;
    if (!tvdbId) {
      throw new InternalServerErrorException('Cannot upsert AquilaTvV2 without tvDBId');
    }

    const existing = await this.prisma.client.aquilaTvV2.findUnique({
      where: { tvDBId: tvdbId },
      select: { id: true, locked: true },
    });

    if (existing?.locked) {
      this.logger.debug(`TV with TVDB ID ${tvdbId} is locked, skipping upsert`);
      return existing;
    }

    let statusEnum: TvStatus = TvStatus.UNKNOWN;
    if (payload.status && payload.status in TvStatus) {
      statusEnum = payload.status as TvStatus;
    }

    const dbRecord = await this.prisma.client.aquilaTvV2.upsert({
      where: { tvDBId: tvdbId },
      update: {
        imdbId: payload.imdbId ?? null,
        tmdbId: payload.tmdbId ?? null,
        traktId: payload.traktId ?? null,
        tvmazeId: payload.tvmazeId ?? null,
        tvrageId: payload.tvrageId ?? null,

        titlePrimary: payload.titlePrimary,
        titleSecondary: payload.titleSecondary ?? null,
        titleNative: payload.titleNative ?? null,
        tagline: payload.tagline ?? null,

        coverImage: payload.coverImage ?? null,
        bannerImage: payload.bannerImage ?? null,
        images: payload.images ?? null,

        description: payload.description ?? null,
        originalLanguage: payload.originalLanguage ?? null,
        countryOfOrigin: payload.countryOfOrigin ?? null,
        episodeCount: payload.episodeCount ?? null,
        seasonCount: payload.seasonCount ?? null,
        averageRuntime: payload.averageRuntime ?? null,
        homepage: payload.homepage ?? null,
        siteUrl: payload.siteUrl ?? null,
        showType: payload.showType ?? null,

        broadcastTime: payload.broadcastTime ?? null,
        broadcastDays: payload.broadcastDays ?? [],

        firstAiredYear: payload.firstAiredYear ?? null,
        firstAiredMonth: payload.firstAiredMonth ?? null,
        firstAiredDay: payload.firstAiredDay ?? null,

        lastAiredYear: payload.lastAiredYear ?? null,
        lastAiredMonth: payload.lastAiredMonth ?? null,
        lastAiredDay: payload.lastAiredDay ?? null,

        genres: payload.genres ?? [],
        tags: payload.tags ?? [],
        networks: payload.networks ?? [],
        studios: payload.studios ?? [],

        status: statusEnum,
        isAdult: payload.isAdult ?? false,
        synonyms: payload.synonyms ?? [],
        trailers: payload.trailers ?? null,

        imdbRating: payload.imdbRating ?? null,
        imdbVotes: payload.imdbVotes ?? null,
        tvmazeRating: payload.tvmazeRating ?? null,
        rottenTomatoesScore: payload.rottenTomatoesScore ?? null,
        awards: payload.awards ?? null,

        sources: payload.sources ?? null,

        ageRating: payload.ageRating ?? null,
        ageRatingGuide: payload.ageRatingGuide ?? null,
        contentRatings: payload.contentRatings ?? null,

        tvdbUpdatedAt: Math.floor(Date.now() / 1000),
        tvmazeUpdatedAt: payload.tvmazeId ? Math.floor(Date.now() / 1000) : undefined,
        imdbUpdatedAt: payload.imdbRating ? Math.floor(Date.now() / 1000) : undefined,
      },
      create: {
        tvDBId: tvdbId,
        imdbId: payload.imdbId ?? null,
        tmdbId: payload.tmdbId ?? null,
        traktId: payload.traktId ?? null,
        tvmazeId: payload.tvmazeId ?? null,
        tvrageId: payload.tvrageId ?? null,

        titlePrimary: payload.titlePrimary,
        titleSecondary: payload.titleSecondary ?? null,
        titleNative: payload.titleNative ?? null,
        tagline: payload.tagline ?? null,

        coverImage: payload.coverImage ?? null,
        bannerImage: payload.bannerImage ?? null,
        images: payload.images ?? null,

        description: payload.description ?? null,
        originalLanguage: payload.originalLanguage ?? null,
        countryOfOrigin: payload.countryOfOrigin ?? null,
        episodeCount: payload.episodeCount ?? null,
        seasonCount: payload.seasonCount ?? null,
        averageRuntime: payload.averageRuntime ?? null,
        homepage: payload.homepage ?? null,
        siteUrl: payload.siteUrl ?? null,
        showType: payload.showType ?? null,

        broadcastTime: payload.broadcastTime ?? null,
        broadcastDays: payload.broadcastDays ?? [],

        firstAiredYear: payload.firstAiredYear ?? null,
        firstAiredMonth: payload.firstAiredMonth ?? null,
        firstAiredDay: payload.firstAiredDay ?? null,

        lastAiredYear: payload.lastAiredYear ?? null,
        lastAiredMonth: payload.lastAiredMonth ?? null,
        lastAiredDay: payload.lastAiredDay ?? null,

        genres: payload.genres ?? [],
        tags: payload.tags ?? [],
        networks: payload.networks ?? [],
        studios: payload.studios ?? [],

        status: statusEnum,
        isAdult: payload.isAdult ?? false,
        synonyms: payload.synonyms ?? [],
        trailers: payload.trailers ?? null,

        averageScore: null,
        imdbRating: payload.imdbRating ?? null,
        imdbVotes: payload.imdbVotes ?? null,
        tvmazeRating: payload.tvmazeRating ?? null,
        rottenTomatoesScore: payload.rottenTomatoesScore ?? null,
        awards: payload.awards ?? null,

        favorites: 0,
        popularity: 0,
        totalScoreSum: null,
        scoredCount: null,
        statusDistribution: {},
        scoreDistribution: {},

        sources: payload.sources ?? null,

        ageRating: payload.ageRating ?? null,
        ageRatingGuide: payload.ageRatingGuide ?? null,
        contentRatings: payload.contentRatings ?? null,

        tvdbUpdatedAt: Math.floor(Date.now() / 1000),
        tvmazeUpdatedAt: payload.tvmazeId ? Math.floor(Date.now() / 1000) : null,
        imdbUpdatedAt: payload.imdbRating ? Math.floor(Date.now() / 1000) : null,
      },
    });

    const tvLocalId = dbRecord.id;

    // Upsert Seasons
    if (payload.seasons && Array.isArray(payload.seasons)) {
      for (const season of payload.seasons) {
        await this.prisma.client.aquilaTvSeasonV2.upsert({
          where: {
            tvId_seasonNumber: {
              tvId: tvLocalId,
              seasonNumber: season.seasonNumber,
            },
          },
          update: {
            tvdbSeasonId: season.tvdbSeasonId ?? null,
            tvmazeSeasonId: season.tvmazeSeasonId ?? null,
            titlePrimary: season.titlePrimary ?? null,
            titleSecondary: season.titleSecondary ?? null,
            description: season.description ?? null,
            posterImage: season.posterImage ?? null,
            airDateYear: season.airDateYear ?? null,
            airDateMonth: season.airDateMonth ?? null,
            airDateDay: season.airDateDay ?? null,
            episodeCount: season.episodeCount ?? null,
            trailers: season.trailers ?? null,
            sources: season.sources ?? null,
          },
          create: {
            tvId: tvLocalId,
            seasonNumber: season.seasonNumber,
            tvdbSeasonId: season.tvdbSeasonId ?? null,
            tvmazeSeasonId: season.tvmazeSeasonId ?? null,
            titlePrimary: season.titlePrimary ?? null,
            titleSecondary: season.titleSecondary ?? null,
            description: season.description ?? null,
            posterImage: season.posterImage ?? null,
            airDateYear: season.airDateYear ?? null,
            airDateMonth: season.airDateMonth ?? null,
            airDateDay: season.airDateDay ?? null,
            episodeCount: season.episodeCount ?? null,
            trailers: season.trailers ?? null,
            sources: season.sources ?? null,
          },
        });
      }
    }

    // Upsert Episodes
    if (payload.episodes && Array.isArray(payload.episodes)) {
      // Fetch season IDs lookup
      const dbSeasons = await this.prisma.client.aquilaTvSeasonV2.findMany({
        where: { tvId: tvLocalId },
        select: { id: true, seasonNumber: true },
      });
      const seasonIdMap = new Map(dbSeasons.map((s) => [s.seasonNumber, s.id]));

      for (const ep of payload.episodes) {
        const seasonId = seasonIdMap.get(ep.seasonNumber) ?? null;

        await this.prisma.client.aquilaTvEpisodeV2.upsert({
          where: {
            tvId_seasonNumber_episodeNumber: {
              tvId: tvLocalId,
              seasonNumber: ep.seasonNumber,
              episodeNumber: ep.episodeNumber,
            },
          },
          update: {
            seasonId,
            titlePrimary: ep.titlePrimary,
            titleSecondary: ep.titleSecondary ?? null,
            titleNative: ep.titleNative ?? null,
            description: ep.description ?? null,
            duration: ep.duration ?? null,
            airDate: ep.airDate ? new Date(ep.airDate) : null,
            airTime: ep.airTime ?? null,
            airstamp: ep.airstamp ? new Date(ep.airstamp) : null,
            rating: ep.rating ?? null,
            episodeType: ep.episodeType ?? null,
            thumbnail: ep.thumbnail ?? null,
            isFiller: ep.isFiller ?? false,
            isRecap: ep.isRecap ?? false,
            sources: ep.sources ?? null,
          },
          create: {
            tvId: tvLocalId,
            seasonId,
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
            titlePrimary: ep.titlePrimary,
            titleSecondary: ep.titleSecondary ?? null,
            titleNative: ep.titleNative ?? null,
            description: ep.description ?? null,
            duration: ep.duration ?? null,
            airDate: ep.airDate ? new Date(ep.airDate) : null,
            airTime: ep.airTime ?? null,
            airstamp: ep.airstamp ? new Date(ep.airstamp) : null,
            rating: ep.rating ?? null,
            episodeType: ep.episodeType ?? null,
            thumbnail: ep.thumbnail ?? null,
            isFiller: ep.isFiller ?? false,
            isRecap: ep.isRecap ?? false,
            sources: ep.sources ?? null,
          },
        });
      }
    }

    // Save Studios (Networks & Production Companies)
    const allStudioNames = [
      ...(payload.studios || []),
      ...(payload.networks || []),
    ];
    for (const studioName of allStudioNames) {
      if (!studioName) continue;
      let studioObj = await this.prisma.client.aquilaStudioV2.findFirst({
        where: { name: studioName },
      });
      if (!studioObj) {
        try {
          studioObj = await this.prisma.client.aquilaStudioV2.create({
            data: { name: studioName },
          });
        } catch {
          studioObj = await this.prisma.client.aquilaStudioV2.findFirst({
            where: { name: studioName },
          });
        }
      }
      if (studioObj) {
        const existingMediaStudio = await this.prisma.client.aquilaMediaStudioV2.findUnique({
          where: {
            mediaType_mediaId_studioId: {
              mediaType: MediaType.TV,
              mediaId: tvLocalId,
              studioId: studioObj.id,
            },
          },
        });
        if (!existingMediaStudio) {
          await this.prisma.client.aquilaMediaStudioV2.create({
            data: {
              mediaType: MediaType.TV,
              mediaId: tvLocalId,
              studioId: studioObj.id,
              isMain: (payload.studios || []).includes(studioName),
            },
          });
        }
      }
    }

    // Save Staff (Crew)
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
            mediaType: MediaType.TV,
            mediaId: tvLocalId,
            staffId: actorObj.id,
            role: roleEnum,
          },
        });

        if (!existingMediaStaff) {
          await this.prisma.client.aquilaMediaStaffV2.create({
            data: {
              mediaType: MediaType.TV,
              mediaId: tvLocalId,
              staffId: actorObj.id,
              role: roleEnum,
              customRole: st.customRole || null,
            },
          });
        }
      }
    }

    // Save Characters (Cast)
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
          : CharacterRole.SUPPORTING;

        // Upsert actor if present
        let actorId: number | null = null;
        if (c.actor?.namePrimary) {
          let actorObj = await this.prisma.client.aquilaActorV2.findFirst({
            where: { namePrimary: c.actor.namePrimary },
          });
          if (!actorObj) {
            actorObj = await this.prisma.client.aquilaActorV2.create({
              data: {
                namePrimary: c.actor.namePrimary,
                image: c.actor.image || null,
              },
            });
          }
          actorId = actorObj.id;
        }

        const existingMediaChar = await this.prisma.client.aquilaMediaCharacterV2.findFirst({
          where: {
            mediaType: MediaType.TV,
            mediaId: tvLocalId,
            characterId: charObj.id,
          },
        });

        if (!existingMediaChar) {
          await this.prisma.client.aquilaMediaCharacterV2.create({
            data: {
              mediaType: MediaType.TV,
              mediaId: tvLocalId,
              tvId: tvLocalId,
              characterId: charObj.id,
              actorId,
              role: charRole,
              order: c.order || null,
            },
          });
        }
      }
    }

    return dbRecord;
  }

  public async findSimilar(id: any): Promise<any[]> {
    const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(numericId)) return [];

    try {
      const target = await this.prisma.client.aquilaTvV2.findUnique({
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

      const candidates = await this.prisma.client.aquilaTvV2.findMany({
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
        const fallback = await this.prisma.client.aquilaTvV2.findMany({
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
        type: 'TV',
      }));
    } catch (err) {
      this.logger.error(`TV findSimilar error: ${err}`);
      return [];
    }
  }
}
