import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { MediaType, RelationType, StaffRole, MovieStatus, CharacterRole } from '@runa/database';
import { MovieEntity, MovieSearchEntity } from './movie.entities';
import { rrError } from 'src/providers/error';

@Injectable()
export class MovieRepository {
  private readonly moduleCode = 'MoRpstry-';
  private readonly logger = new Logger(MovieRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async search(queryStr: string): Promise<MovieSearchEntity[]> {
    this.logger.debug(`Searching for movies: "${queryStr}" in local AquilaMovieV2`);
    try {
      const clean = queryStr.trim();
      if (!clean) return [];

      const records = await this.prisma.client.aquilaMovieV2.findMany({
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
        tvdbId: item.tvDBId,
        imdbId: item.imdbId,
        title: item.titlePrimary,
        secondaryTitle: item.titleSecondary || item.titleNative || null,
        coverImage: item.coverImage || null,
        format: 'MOVIE',
        status: item.status,
        isAdult: item.isAdult,
        averageScore: item.averageScore,
        releaseDateYear: item.releaseDateYear,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to search movies from V2 db: ${err?.message || err}`);
      throw new rrError(`${this.moduleCode}FTFAFD001`, {
        message: 'Failed to fetch movies from db',
      });
    }
  }

  public async find(id: number): Promise<MovieEntity | null> {
    const numericId = typeof id === 'number' ? id : Number(id);
    if (isNaN(numericId)) return null;

    let record = await this.prisma.client.aquilaMovieV2.findUnique({
      where: { id: numericId },
    });

    if (!record) {
      record = await this.prisma.client.aquilaMovieV2.findUnique({
        where: { tvDBId: numericId },
      });
    }

    if (!record) return null;
    const movieLocalId = record.id;

    const [rawCharacters, rawStudios, rawStaff, rawRelations] = await Promise.all([
      this.prisma.client.aquilaMediaCharacterV2.findMany({
        where: { mediaType: MediaType.MOVIE, mediaId: movieLocalId },
        include: { character: true, actor: true },
        orderBy: { role: 'asc' },
      }),
      this.prisma.client.aquilaMediaStudioV2.findMany({
        where: { mediaType: MediaType.MOVIE, mediaId: movieLocalId },
        include: { studio: true },
      }),
      this.prisma.client.aquilaMediaStaffV2.findMany({
        where: { mediaType: MediaType.MOVIE, mediaId: movieLocalId },
        include: { staff: true },
      }),
      this.prisma.client.aquilaMediaRelationV2.findMany({
        where: { sourceType: MediaType.MOVIE, sourceId: movieLocalId },
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
      }

      relations.push({
        id: rel.id,
        type: rel.type,
        targetType: rel.targetType,
        targetId: rel.targetId,
        titlePrimary: targetDetails?.titlePrimary || 'Unknown',
        coverImage: targetDetails?.coverImage || null,
        format: targetDetails?.format || 'MOVIE',
        status: targetDetails?.status || 'RELEASED',
      });
    }

    return {
      id: record.id,
      tvDBId: record.tvDBId,
      imdbId: record.imdbId,
      traktId: record.traktId,

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
      runtime: record.runtime,
      budget: record.budget ? record.budget.toString() : null,
      revenue: record.revenue ? record.revenue.toString() : null,
      homepage: record.homepage,
      siteUrl: record.siteUrl,

      releaseDateYear: record.releaseDateYear,
      releaseDateMonth: record.releaseDateMonth,
      releaseDateDay: record.releaseDateDay,

      genres: record.genres,
      status: record.status,
      isAdult: record.isAdult,
      synonyms: record.synonyms,
      trailers: record.trailers,
      locked: record.locked,

      averageScore: record.averageScore,
      favorites: record.favorites,
      popularity: record.popularity,
      totalScoreSum: record.totalScoreSum,
      scoredCount: record.scoredCount,
      statusDistribution: (record.statusDistribution as Record<string, number>) || {},
      scoreDistribution: (record.scoreDistribution as Record<string, number>) || {},

      imdbRating: record.imdbRating,
      imdbVotes: record.imdbVotes,

      sources: record.sources,

      ageRating: record.ageRating,
      ageRatingGuide: record.ageRatingGuide,

      imdbUpdatedAt: record.imdbUpdatedAt,
      tvdbUpdatedAt: record.tvdbUpdatedAt,

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
              anilistId: c.actor.anilistId,
              malId: c.actor.malId,
              tvDBId: c.actor.tvDBId,
              namePrimary: c.actor.namePrimary,
              nameNative: c.actor.nameNative,
              image: c.actor.image,
              role: 'ACTOR',
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
          anilistId: st.staff.anilistId,
          malId: st.staff.malId,
          tvDBId: st.staff.tvDBId,
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
    return this.prisma.client.aquilaMovieV2.findUnique({
      where: { tvDBId: tvdbId },
      select: {
        id: true,
        tvDBId: true,
        titlePrimary: true,
        coverImage: true,
        locked: true,
        tvdbUpdatedAt: true,
      },
    });
  }

  public async upsertV2Record(payload: any): Promise<any> {
    const { tvDBId } = payload;
    if (!tvDBId) {
      throw new rrError(`${this.moduleCode}NOTVDBID001`, {
        message: 'Cannot upsert AquilaMovieV2 without tvDBId',
      });
    }

    const existing = await this.prisma.client.aquilaMovieV2.findUnique({
      where: { tvDBId },
      select: { id: true, locked: true },
    });

    if (existing?.locked) {
      this.logger.debug(`Movie with TVDB ID ${tvDBId} is locked, skipping upsert`);
      return existing;
    }

    let statusEnum: MovieStatus = MovieStatus.RELEASED;
    if (payload.status && payload.status in MovieStatus) {
      statusEnum = payload.status as MovieStatus;
    }

    const dbRecord = await this.prisma.client.aquilaMovieV2.upsert({
      where: { tvDBId },
      update: {
        imdbId: payload.imdbId ?? null,
        traktId: payload.traktId ?? null,

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
        runtime: payload.runtime ?? null,
        budget: payload.budget ?? null,
        revenue: payload.revenue ?? null,
        homepage: payload.homepage ?? null,
        siteUrl: payload.siteUrl ?? null,

        releaseDateYear: payload.releaseDateYear ?? null,
        releaseDateMonth: payload.releaseDateMonth ?? null,
        releaseDateDay: payload.releaseDateDay ?? null,

        genres: payload.genres ?? [],
        status: statusEnum,
        isAdult: payload.isAdult ?? false,
        synonyms: payload.synonyms ?? [],
        trailers: payload.trailers ?? null,

        sources: payload.sources ?? null,

        ageRating: payload.ageRating ?? null,
        ageRatingGuide: payload.ageRatingGuide ?? null,

        imdbUpdatedAt: payload.imdbUpdatedAt ?? null,
        tvdbUpdatedAt: payload.tvdbUpdatedAt ?? Math.floor(Date.now() / 1000),
      },
      create: {
        tvDBId,
        imdbId: payload.imdbId ?? null,
        traktId: payload.traktId ?? null,

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
        runtime: payload.runtime ?? null,
        budget: payload.budget ?? null,
        revenue: payload.revenue ?? null,
        homepage: payload.homepage ?? null,
        siteUrl: payload.siteUrl ?? null,

        releaseDateYear: payload.releaseDateYear ?? null,
        releaseDateMonth: payload.releaseDateMonth ?? null,
        releaseDateDay: payload.releaseDateDay ?? null,

        genres: payload.genres ?? [],
        status: statusEnum,
        isAdult: payload.isAdult ?? false,
        synonyms: payload.synonyms ?? [],
        trailers: payload.trailers ?? null,

        averageScore: null,
        favorites: 0,
        popularity: 0,
        totalScoreSum: null,
        scoredCount: null,
        statusDistribution: {},
        scoreDistribution: {},

        sources: payload.sources ?? null,

        ageRating: payload.ageRating ?? null,
        ageRatingGuide: payload.ageRatingGuide ?? null,

        imdbUpdatedAt: payload.imdbUpdatedAt ?? null,
        tvdbUpdatedAt: payload.tvdbUpdatedAt ?? Math.floor(Date.now() / 1000),
      },
    });

    const movieLocalId = dbRecord.id;

    // Save Studios
    if (payload.studios && Array.isArray(payload.studios)) {
      for (const st of payload.studios) {
        if (!st.name) continue;
        let studioObj = await this.prisma.client.aquilaStudioV2.findFirst({
          where: { name: st.name },
        });
        if (!studioObj) {
          try {
            studioObj = await this.prisma.client.aquilaStudioV2.create({
              data: { name: st.name },
            });
          } catch {
            studioObj = await this.prisma.client.aquilaStudioV2.findFirst({
              where: { name: st.name },
            });
          }
        }
        if (studioObj) {
          const existingMediaStudio = await this.prisma.client.aquilaMediaStudioV2.findUnique({
            where: {
              mediaType_mediaId_studioId: {
                mediaType: MediaType.MOVIE,
                mediaId: movieLocalId,
                studioId: studioObj.id,
              },
            },
          });
          if (!existingMediaStudio) {
            await this.prisma.client.aquilaMediaStudioV2.create({
              data: {
                mediaType: MediaType.MOVIE,
                mediaId: movieLocalId,
                studioId: studioObj.id,
                isMain: st.isMain || false,
              },
            });
          }
        }
      }
    }

    // Save Characters & Actors
    if (payload.characters && Array.isArray(payload.characters)) {
      for (const c of payload.characters) {
        if (!c.namePrimary) continue;
        let charObj = await this.prisma.client.aquilaCharacterV2.findFirst({
          where: { namePrimary: c.namePrimary },
        });
        if (!charObj) {
          charObj = await this.prisma.client.aquilaCharacterV2.create({
            data: {
              namePrimary: c.namePrimary,
              image: c.image || null,
            },
          });
        }

        let actorId: number | null = null;
        if (c.actor && c.actor.namePrimary) {
          let actorObj: any = null;
          if (c.actor.tvDBId) {
            actorObj = await this.prisma.client.aquilaActorV2.findUnique({
              where: { tvDBId: c.actor.tvDBId },
            });
          }
          if (!actorObj) {
            actorObj = await this.prisma.client.aquilaActorV2.findFirst({
              where: { namePrimary: c.actor.namePrimary },
            });
          }
          if (!actorObj) {
            actorObj = await this.prisma.client.aquilaActorV2.create({
              data: {
                tvDBId: c.actor.tvDBId || null,
                namePrimary: c.actor.namePrimary,
                image: c.actor.image || null,
              },
            });
          }
          actorId = actorObj.id;
        }

        const existingMediaChar = await this.prisma.client.aquilaMediaCharacterV2.findFirst({
          where: {
            mediaType: MediaType.MOVIE,
            mediaId: movieLocalId,
            characterId: charObj.id,
          },
        });

        const validRoles = ['MAIN', 'SUPPORTING', 'BACKGROUND'];
        const uppercaseRole = c.role ? String(c.role).toUpperCase() : '';
        const charRole = validRoles.includes(uppercaseRole)
          ? (uppercaseRole as CharacterRole)
          : uppercaseRole.includes('SUPPORT')
            ? CharacterRole.SUPPORTING
            : CharacterRole.MAIN;

        if (!existingMediaChar) {
          await this.prisma.client.aquilaMediaCharacterV2.create({
            data: {
              mediaType: MediaType.MOVIE,
              mediaId: movieLocalId,
              movieId: movieLocalId,
              characterId: charObj.id,
              role: charRole,
              actorId,
            },
          });
        }
      }
    }

    // Save Staff
    if (payload.staff && Array.isArray(payload.staff)) {
      for (const st of payload.staff) {
        if (!st.namePrimary) continue;
        let actorObj: any = null;
        if (st.tvDBId) {
          actorObj = await this.prisma.client.aquilaActorV2.findUnique({
            where: { tvDBId: st.tvDBId },
          });
        }
        if (!actorObj) {
          actorObj = await this.prisma.client.aquilaActorV2.findFirst({
            where: { namePrimary: st.namePrimary },
          });
        }
        if (!actorObj) {
          actorObj = await this.prisma.client.aquilaActorV2.create({
            data: {
              tvDBId: st.tvDBId || null,
              namePrimary: st.namePrimary,
              image: st.image || null,
            },
          });
        }

        const roleEnum = st.role in StaffRole ? (st.role as StaffRole) : StaffRole.OTHER;
        const existingMediaStaff = await this.prisma.client.aquilaMediaStaffV2.findFirst({
          where: {
            mediaType: MediaType.MOVIE,
            mediaId: movieLocalId,
            staffId: actorObj.id,
            role: roleEnum,
          },
        });

        if (!existingMediaStaff) {
          await this.prisma.client.aquilaMediaStaffV2.create({
            data: {
              mediaType: MediaType.MOVIE,
              mediaId: movieLocalId,
              staffId: actorObj.id,
              role: roleEnum,
              customRole: st.customRole || null,
            },
          });
        }
      }
    }

    // Save Relations
    if (payload.relations && Array.isArray(payload.relations)) {
      for (const rel of payload.relations) {
        if (!rel.targetId && !rel.targetAnilistId && !rel.targetTvdbId) continue;
        let targetId: number | null = null;
        const targetTypeStr = (rel.targetType || 'MOVIE').toUpperCase();
        const targetType = (
          targetTypeStr in MediaType ? targetTypeStr : 'MOVIE'
        ) as MediaType;

        if (targetType === MediaType.ANIME && rel.targetAnilistId) {
          let targetRecord = await this.prisma.client.aquilaAnimeV2.findUnique({
            where: { anilistId: rel.targetAnilistId },
            select: { id: true },
          });
          if (!targetRecord) {
            try {
              targetRecord = await this.prisma.client.aquilaAnimeV2.create({
                data: {
                  anilistId: rel.targetAnilistId,
                  titlePrimary: rel.titlePrimary || 'Unknown',
                  coverImage: rel.coverImage || null,
                  format: rel.format || 'UNKNOWN',
                  startDateYear: 1970,
                  seasonYear: 1970,
                },
                select: { id: true },
              });
            } catch {
              targetRecord = await this.prisma.client.aquilaAnimeV2.findUnique({
                where: { anilistId: rel.targetAnilistId },
                select: { id: true },
              });
            }
          }
          if (targetRecord) targetId = targetRecord.id;
        } else if (targetType === MediaType.MANGA && rel.targetAnilistId) {
          let targetRecord = await this.prisma.client.aquilaMangaV2.findUnique({
            where: { anilistId: rel.targetAnilistId },
            select: { id: true },
          });
          if (!targetRecord) {
            try {
              targetRecord = await this.prisma.client.aquilaMangaV2.create({
                data: {
                  anilistId: rel.targetAnilistId,
                  titlePrimary: rel.titlePrimary || 'Unknown',
                  coverImage: rel.coverImage || null,
                  format: rel.format || 'UNKNOWN',
                  startDateYear: 1970,
                },
                select: { id: true },
              });
            } catch {
              targetRecord = await this.prisma.client.aquilaMangaV2.findUnique({
                where: { anilistId: rel.targetAnilistId },
                select: { id: true },
              });
            }
          }
          if (targetRecord) targetId = targetRecord.id;
        } else if (targetType === MediaType.MOVIE && rel.targetTvdbId) {
          let targetRecord = await this.prisma.client.aquilaMovieV2.findUnique({
            where: { tvDBId: rel.targetTvdbId },
            select: { id: true },
          });
          if (!targetRecord) {
            try {
              targetRecord = await this.prisma.client.aquilaMovieV2.create({
                data: {
                  tvDBId: rel.targetTvdbId,
                  titlePrimary: rel.titlePrimary || 'Unknown',
                  coverImage: rel.coverImage || null,
                  releaseDateYear: 1970,
                },
                select: { id: true },
              });
            } catch {
              targetRecord = await this.prisma.client.aquilaMovieV2.findUnique({
                where: { tvDBId: rel.targetTvdbId },
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
              sourceType: MediaType.MOVIE,
              sourceId: movieLocalId,
              targetType,
              targetId,
              type: relType,
            },
          });
          if (!existingRel) {
            await this.prisma.client.aquilaMediaRelationV2.create({
              data: {
                sourceType: MediaType.MOVIE,
                sourceId: movieLocalId,
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
      const target = await this.prisma.client.aquilaMovieV2.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          titlePrimary: true,
          genres: true,
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
      if (titleKey) {
        whereConditions.push({ titlePrimary: { contains: titleKey, mode: 'insensitive' } });
      }

      const candidates = await this.prisma.client.aquilaMovieV2.findMany({
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
        const fallback = await this.prisma.client.aquilaMovieV2.findMany({
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
        type: 'MOVIE',
      }));
    } catch (err) {
      this.logger.error(`Movie findSimilar error: ${err}`);
      return [];
    }
  }
}
