import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { AnimeEntity, AnimeSearchEntity } from './anime.entities';
import { AnimeFormat, AnimeStatus, CharacterRole, MediaType } from '@runa/database';

@Injectable()
export class AnimeRepository {
  private readonly logger = new Logger(AnimeRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async search(name: string): Promise<AnimeSearchEntity[]> {
    const cleanName = name.trim();
    if (!cleanName) return [];

    this.logger.debug(`Searching for anime V2: "${cleanName}" in local db`);
    try {
      const data = await this.prisma.client.aquilaAnimeV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: cleanName, mode: 'insensitive' } },
            { titleSecondary: { contains: cleanName, mode: 'insensitive' } },
            { titleNative: { contains: cleanName, mode: 'insensitive' } },
            { synonyms: { has: cleanName } },
          ],
        },
        take: 30,
        orderBy: { popularity: 'desc' },
      });

      return data.map((item) => ({
        id: item.id,
        title: item.titlePrimary,
        secondaryTitle: item.titleSecondary || null,
        coverImage: item.coverImage || null,
        averageScore: item.averageScore || null,
        isAdult: item.isAdult || false,
        format: item.format as AnimeFormat,
        status: item.status as AnimeStatus,
        seasonYear: item.seasonYear || item.startDateYear || null,
        episodes: item.episodeCount || null,
      }));
    } catch (err: any) {
      this.logger.error(`Database anime search error: ${err.message}`);
      return [];
    }
  }

  public async find(id: number): Promise<AnimeEntity | null> {
    const numericId = typeof id === 'number' ? id : Number(id);
    if (isNaN(numericId)) return null;

    const record = await this.prisma.client.aquilaAnimeV2.findUnique({
      where: { id: numericId },
      include: {
        episodes: { orderBy: { number: 'asc' } },
        airingSchedule: { orderBy: { episodeNumber: 'asc' } },
        characters: {
          include: {
            character: true,
            actor: true,
          },
          orderBy: { order: 'asc' },
        },
        studios: {
          include: {
            studio: true,
          },
        },
        staff: {
          include: {
            staff: true,
          },
        },
      },
    });

    if (!record) return null;

    let relations: any[] = [];
    try {
      const relationsRaw = await this.prisma.client.aquilaMediaRelationV2.findMany({
        where: { sourceType: MediaType.ANIME, sourceId: numericId },
      });

      relations = await Promise.all(
        relationsRaw.map(async (r) => {
          let targetMedia: any = null;
          if (r.targetType === MediaType.ANIME) {
            targetMedia = await this.prisma.client.aquilaAnimeV2.findUnique({
              where: { id: r.targetId },
              select: {
                id: true,
                anilistId: true,
                titlePrimary: true,
                titleSecondary: true,
                coverImage: true,
                format: true,
                status: true,
                seasonYear: true,
              },
            });
          } else if (r.targetType === MediaType.MANGA) {
            targetMedia = await this.prisma.client.aquilaMangaV2.findUnique({
              where: { id: r.targetId },
              select: {
                id: true,
                anilistId: true,
                titlePrimary: true,
                titleSecondary: true,
                coverImage: true,
                format: true,
                status: true,
              },
            });
          }

          return {
            id: r.id,
            sourceType: r.sourceType,
            sourceId: r.sourceId,
            targetType: r.targetType,
            targetId: r.targetId,
            type: r.type,
            targetMedia,
          };
        }),
      );
    } catch (err: any) {
      this.logger.warn(`Failed to fetch relations for anime ${numericId}: ${err.message}`);
    }

    return {
      ...record,
      relations,
    } as unknown as AnimeEntity;
  }

  public async findByAnilistId(anilistId: number): Promise<any | null> {
    return this.prisma.client.aquilaAnimeV2.findUnique({
      where: { anilistId },
      select: {
        id: true,
        anilistId: true,
        titlePrimary: true,
        coverImage: true,
        locked: true,
        alUpdatedAt: true,
      },
    });
  }

  public async upsertV2Record(payload: any): Promise<any> {
    if (!payload?.anilistId) {
      throw new Error('anilistId is required for anime V2 upsert');
    }

    const existing = await this.prisma.client.aquilaAnimeV2.findUnique({
      where: { anilistId: payload.anilistId },
      select: { id: true, locked: true },
    });

    if (existing?.locked) {
      this.logger.debug(
        `Anime V2 with AniList ID ${payload.anilistId} is locked, skipping upsert`,
      );
      return existing;
    }

    // Ensure external unique IDs do not conflict with existing records
    let malId = payload.malId ?? null;
    let aniDBId = payload.aniDBId ?? null;
    let tvDBId = payload.tvDBId ?? null;
    let bangumiId = payload.bangumiId ?? null;

    if (tvDBId) {
      const conflict = await this.prisma.client.aquilaAnimeV2.findUnique({
        where: { tvDBId },
        select: { id: true, anilistId: true },
      });
      if (conflict && conflict.anilistId !== payload.anilistId) {
        this.logger.warn(
          `tvDBId ${tvDBId} already belongs to another anime (ID ${conflict.id}), setting to null`,
        );
        tvDBId = null;
      }
    }

    if (malId) {
      const conflict = await this.prisma.client.aquilaAnimeV2.findUnique({
        where: { malId },
        select: { id: true, anilistId: true },
      });
      if (conflict && conflict.anilistId !== payload.anilistId) {
        this.logger.warn(
          `malId ${malId} already belongs to another anime (ID ${conflict.id}), setting to null`,
        );
        malId = null;
      }
    }

    if (aniDBId) {
      const conflict = await this.prisma.client.aquilaAnimeV2.findUnique({
        where: { aniDBId },
        select: { id: true, anilistId: true },
      });
      if (conflict && conflict.anilistId !== payload.anilistId) {
        this.logger.warn(
          `aniDBId ${aniDBId} already belongs to another anime (ID ${conflict.id}), setting to null`,
        );
        aniDBId = null;
      }
    }

    if (bangumiId) {
      const conflict = await this.prisma.client.aquilaAnimeV2.findUnique({
        where: { bangumiId },
        select: { id: true, anilistId: true },
      });
      if (conflict && conflict.anilistId !== payload.anilistId) {
        this.logger.warn(
          `bangumiId ${bangumiId} already belongs to another anime (ID ${conflict.id}), setting to null`,
        );
        bangumiId = null;
      }
    }

    // 1. Upsert main AquilaAnimeV2 record
    const anime = await this.prisma.client.aquilaAnimeV2.upsert({
      where: { anilistId: payload.anilistId },
      update: {
        malId: malId ?? undefined,
        aniDBId: aniDBId ?? undefined,
        tvDBId: tvDBId ?? undefined,
        bangumiId: bangumiId ?? undefined,

        titlePrimary: payload.titlePrimary,
        titleSecondary: payload.titleSecondary,
        titleNative: payload.titleNative,

        coverImage: payload.coverImage,
        bannerImage: payload.bannerImage,
        images: payload.images ?? undefined,

        description: payload.description,
        hashtag: payload.hashtag,
        countryOfOrigin: payload.countryOfOrigin,

        episodeCount: payload.episodeCount,
        episodeDuration: payload.episodeDuration,

        startDateYear: payload.startDateYear,
        startDateMonth: payload.startDateMonth,
        startDateDay: payload.startDateDay,

        endDateYear: payload.endDateYear,
        endDateMonth: payload.endDateMonth,
        endDateDay: payload.endDateDay,

        genres: payload.genres || [],
        source: payload.source || 'UNKNOWN',
        format: payload.format || 'UNKNOWN',
        status: payload.status || 'UNKNOWN',
        seasonSeason: payload.seasonSeason || 'UNKNOWN',
        seasonYear: payload.seasonYear,

        averageScore: payload.averageScore,
        favorites: payload.favorites || 0,
        popularity: payload.popularity || 0,

        alAverageScore: payload.alAverageScore,
        alFavorites: payload.alFavorites,
        alPopularity: payload.alPopularity,

        malAverageScore: payload.malAverageScore,
        malFavorites: payload.malFavorites,
        malPopularity: payload.malPopularity,

        ageRating: payload.ageRating ?? null,
        ageRatingGuide: payload.ageRatingGuide ?? null,

        isAdult: payload.isAdult || false,
        synonyms: payload.synonyms || [],
        trailers: payload.trailers ?? undefined,

        siteUrl: payload.siteUrl,
        externalLinks: payload.externalLinks ?? undefined,
        sources: payload.sources ?? undefined,
        themeSongs: payload.themeSongs ?? undefined,

        nextAiringEpisodeNumber: payload.nextAiringEpisodeNumber,
        nextAiringAt: payload.nextAiringAt,

        alUpdatedAt: payload.alUpdatedAt,
        malUpdatedAt: payload.malUpdatedAt,
        anidbUpdatedAt: payload.anidbUpdatedAt,
      },
      create: {
        anilistId: payload.anilistId,
        malId,
        aniDBId,
        tvDBId,
        bangumiId,

        titlePrimary: payload.titlePrimary,
        titleSecondary: payload.titleSecondary,
        titleNative: payload.titleNative,

        coverImage: payload.coverImage,
        bannerImage: payload.bannerImage,
        images: payload.images,

        description: payload.description,
        hashtag: payload.hashtag,
        countryOfOrigin: payload.countryOfOrigin,

        episodeCount: payload.episodeCount,
        episodeDuration: payload.episodeDuration,

        startDateYear: payload.startDateYear || 1970,
        startDateMonth: payload.startDateMonth,
        startDateDay: payload.startDateDay,

        endDateYear: payload.endDateYear,
        endDateMonth: payload.endDateMonth,
        endDateDay: payload.endDateDay,

        genres: payload.genres || [],
        source: payload.source || 'UNKNOWN',
        format: payload.format || 'UNKNOWN',
        status: payload.status || 'UNKNOWN',
        seasonSeason: payload.seasonSeason || 'UNKNOWN',
        seasonYear: payload.seasonYear || 1970,

        averageScore: payload.averageScore,
        favorites: payload.favorites || 0,
        popularity: payload.popularity || 0,

        alAverageScore: payload.alAverageScore,
        alFavorites: payload.alFavorites,
        alPopularity: payload.alPopularity,

        malAverageScore: payload.malAverageScore,
        malFavorites: payload.malFavorites,
        malPopularity: payload.malPopularity,

        ageRating: payload.ageRating ?? null,
        ageRatingGuide: payload.ageRatingGuide ?? null,

        isAdult: payload.isAdult || false,
        synonyms: payload.synonyms || [],
        trailers: payload.trailers,

        siteUrl: payload.siteUrl,
        externalLinks: payload.externalLinks,
        sources: payload.sources,
        themeSongs: payload.themeSongs,

        nextAiringEpisodeNumber: payload.nextAiringEpisodeNumber,
        nextAiringAt: payload.nextAiringAt,

        alUpdatedAt: payload.alUpdatedAt,
        malUpdatedAt: payload.malUpdatedAt,
        anidbUpdatedAt: payload.anidbUpdatedAt,
      },
    });

    const animeLocalId = anime.id;

    // 2. Process Studios using local IDs (isolated in try-catch)
    if (payload.studios && Array.isArray(payload.studios)) {
      for (const st of payload.studios) {
        if (!st.name) continue;
        try {
          const studioRecord = await this.prisma.client.aquilaStudioV2.upsert({
            where: { anilistId: st.anilistId || undefined },
            update: {
              name: st.name,
              isAnimationStudio: st.isAnimationStudio || false,
              siteUrl: st.siteUrl || null,
              alFavorites: st.alFavorites || null,
            },
            create: {
              anilistId: st.anilistId || null,
              malId: st.malId || null,
              tvDBId: st.tvDBId || null,
              name: st.name,
              isAnimationStudio: st.isAnimationStudio || false,
              siteUrl: st.siteUrl || null,
              alFavorites: st.alFavorites || null,
            },
          });

          await this.prisma.client.aquilaMediaStudioV2.upsert({
            where: {
              mediaType_mediaId_studioId: {
                mediaType: MediaType.ANIME,
                mediaId: animeLocalId,
                studioId: studioRecord.id,
              },
            },
            update: { isMain: st.isMain || false, animeId: animeLocalId },
            create: {
              mediaType: MediaType.ANIME,
              mediaId: animeLocalId,
              animeId: animeLocalId,
              studioId: studioRecord.id,
              isMain: st.isMain || false,
            },
          });
        } catch (err: any) {
          this.logger.warn(`Studio upsert non-blocking notice for "${st.name}": ${err.message}`);
        }
      }
    }

    // 3. Process Characters and Voice Actors using local IDs (isolated in try-catch)
    if (payload.characters && Array.isArray(payload.characters)) {
      for (let orderIndex = 0; orderIndex < payload.characters.length; orderIndex++) {
        const ch = payload.characters[orderIndex];
        if (!ch.namePrimary) continue;

        try {
          const charRecord = await this.prisma.client.aquilaCharacterV2.upsert({
            where: { anilistId: ch.anilistId || undefined },
            update: {
              namePrimary: ch.namePrimary,
              nameNative: ch.nameNative || null,
              nameAlternative: ch.nameAlternative || [],
              nameAlternativeSpoiler: ch.nameAlternativeSpoiler || [],
              image: ch.image || null,
              description: ch.description || null,
              gender: ch.gender || null,
              age: ch.age || null,
              bloodType: ch.bloodType || null,
              dateOfBirthYear: ch.dateOfBirthYear || null,
              dateOfBirthMonth: ch.dateOfBirthMonth || null,
              dateOfBirthDay: ch.dateOfBirthDay || null,
              alFavorites: ch.alFavorites || null,
            },
            create: {
              anilistId: ch.anilistId || null,
              malId: ch.malId || null,
              namePrimary: ch.namePrimary,
              nameNative: ch.nameNative || null,
              nameAlternative: ch.nameAlternative || [],
              nameAlternativeSpoiler: ch.nameAlternativeSpoiler || [],
              image: ch.image || null,
              description: ch.description || null,
              gender: ch.gender || null,
              age: ch.age || null,
              bloodType: ch.bloodType || null,
              dateOfBirthYear: ch.dateOfBirthYear || null,
              dateOfBirthMonth: ch.dateOfBirthMonth || null,
              dateOfBirthDay: ch.dateOfBirthDay || null,
              alFavorites: ch.alFavorites || null,
            },
          });

          const voiceActorList =
            ch.voiceActors && Array.isArray(ch.voiceActors) ? ch.voiceActors : [null];

          for (const va of voiceActorList) {
            let actorRecordId: number | null = null;
            if (va && va.namePrimary) {
              try {
                const actorRecord = await this.prisma.client.aquilaActorV2.upsert({
                  where: { anilistId: va.anilistId || undefined },
                  update: {
                    namePrimary: va.namePrimary,
                    nameNative: va.nameNative || null,
                    nameAlternative: va.nameAlternative || [],
                    image: va.image || null,
                    language: va.language || 'Japanese',
                  },
                  create: {
                    anilistId: va.anilistId || null,
                    malId: va.malId || null,
                    namePrimary: va.namePrimary,
                    nameNative: va.nameNative || null,
                    nameAlternative: va.nameAlternative || [],
                    image: va.image || null,
                    language: va.language || 'Japanese',
                  },
                });
                actorRecordId = actorRecord.id;
              } catch (err: any) {
                this.logger.warn(`Voice actor upsert non-blocking notice: ${err.message}`);
              }
            }

            const charRole = (
              ch.role === 'SUPPORTING' || ch.role === 'BACKGROUND' ? ch.role : 'MAIN'
            ) as CharacterRole;

            try {
              await this.prisma.client.aquilaMediaCharacterV2.upsert({
                where: {
                  mediaType_mediaId_characterId_actorId: {
                    mediaType: MediaType.ANIME,
                    mediaId: animeLocalId,
                    characterId: charRecord.id,
                    actorId: actorRecordId ?? 0,
                  },
                },
                update: {
                  role: charRole,
                  order: orderIndex + 1,
                  animeId: animeLocalId,
                },
                create: {
                  mediaType: MediaType.ANIME,
                  mediaId: animeLocalId,
                  animeId: animeLocalId,
                  characterId: charRecord.id,
                  actorId: actorRecordId,
                  role: charRole,
                  order: orderIndex + 1,
                },
              });
            } catch (err: any) {
              this.logger.warn(
                `MediaCharacterV2 upsert non-blocking notice for "${ch.namePrimary}": ${err.message}`,
              );
            }
          }
        } catch (err: any) {
          this.logger.warn(
            `CharacterV2 upsert non-blocking notice for "${ch.namePrimary}": ${err.message}`,
          );
        }
      }
    }

    // 4. Process Staff using local IDs (isolated in try-catch)
    if (payload.staff && Array.isArray(payload.staff)) {
      for (const st of payload.staff) {
        if (!st.namePrimary) continue;
        try {
          const staffRecord = await this.prisma.client.aquilaActorV2.upsert({
            where: { anilistId: st.anilistId || undefined },
            update: {
              namePrimary: st.namePrimary,
              nameNative: st.nameNative || null,
              nameAlternative: st.nameAlternative || [],
              image: st.image || null,
            },
            create: {
              anilistId: st.anilistId || null,
              malId: st.malId || null,
              namePrimary: st.namePrimary,
              nameNative: st.nameNative || null,
              nameAlternative: st.nameAlternative || [],
              image: st.image || null,
            },
          });

          await this.prisma.client.aquilaMediaStaffV2.upsert({
            where: {
              mediaType_mediaId_staffId_role: {
                mediaType: MediaType.ANIME,
                mediaId: animeLocalId,
                staffId: staffRecord.id,
                role: st.role,
              },
            },
            update: { customRole: st.customRole || null, animeId: animeLocalId },
            create: {
              mediaType: MediaType.ANIME,
              mediaId: animeLocalId,
              animeId: animeLocalId,
              staffId: staffRecord.id,
              role: st.role,
              customRole: st.customRole || null,
            },
          });
        } catch (err: any) {
          this.logger.warn(
            `MediaStaffV2 upsert non-blocking notice for "${st.namePrimary}": ${err.message}`,
          );
        }
      }
    }

    // 5. Process Episodes (isolated in try-catch)
    if (payload.episodes && Array.isArray(payload.episodes)) {
      for (const ep of payload.episodes) {
        try {
          await this.prisma.client.aquilaAnimeEpisode.upsert({
            where: {
              animeId_number_type: {
                animeId: animeLocalId,
                number: ep.number,
                type: ep.type || 'REGULAR',
              },
            },
            update: {
              titlePrimary: ep.titlePrimary,
              titleSecondary: ep.titleSecondary || null,
              titleNative: ep.titleNative || null,
              description: ep.description || null,
              duration: ep.duration || null,
              airDate: ep.airDate ? new Date(ep.airDate) : null,
              thumbnail: ep.thumbnail || null,
              isFiller: ep.isFiller || false,
              isRecap: ep.isRecap || false,
              opStart: ep.opStart ?? null,
              opEnd: ep.opEnd ?? null,
              edStart: ep.edStart ?? null,
              edEnd: ep.edEnd ?? null,
              recapStart: ep.recapStart ?? null,
              recapEnd: ep.recapEnd ?? null,
              skipTimestamps: ep.skipTimestamps ?? undefined,
              malEpisodeId: ep.malEpisodeId || null,
              anidbEpisodeId: ep.anidbEpisodeId || null,
            },
            create: {
              animeId: animeLocalId,
              number: ep.number,
              type: ep.type || 'REGULAR',
              titlePrimary: ep.titlePrimary,
              titleSecondary: ep.titleSecondary || null,
              titleNative: ep.titleNative || null,
              description: ep.description || null,
              duration: ep.duration || null,
              airDate: ep.airDate ? new Date(ep.airDate) : null,
              thumbnail: ep.thumbnail || null,
              isFiller: ep.isFiller || false,
              isRecap: ep.isRecap || false,
              opStart: ep.opStart ?? null,
              opEnd: ep.opEnd ?? null,
              edStart: ep.edStart ?? null,
              edEnd: ep.edEnd ?? null,
              recapStart: ep.recapStart ?? null,
              recapEnd: ep.recapEnd ?? null,
              skipTimestamps: ep.skipTimestamps ?? undefined,
              malEpisodeId: ep.malEpisodeId || null,
              anidbEpisodeId: ep.anidbEpisodeId || null,
            },
          });
        } catch (err: any) {
          this.logger.warn(
            `Episode upsert non-blocking notice for Ep ${ep.number}: ${err.message}`,
          );
        }
      }
    }

    // 6. Process AiringSchedule (isolated in try-catch)
    if (payload.airingSchedule && Array.isArray(payload.airingSchedule)) {
      for (const scheduleItem of payload.airingSchedule) {
        try {
          await this.prisma.client.aquilaAnimeAiringSchedule.upsert({
            where: {
              animeId_episodeNumber: {
                animeId: animeLocalId,
                episodeNumber: scheduleItem.episodeNumber,
              },
            },
            update: {
              airingAt: new Date(scheduleItem.airingAt),
              anilistAiringId: scheduleItem.anilistAiringId || null,
            },
            create: {
              animeId: animeLocalId,
              episodeNumber: scheduleItem.episodeNumber,
              airingAt: new Date(scheduleItem.airingAt),
              anilistAiringId: scheduleItem.anilistAiringId || null,
            },
          });
        } catch (err: any) {
          this.logger.warn(
            `AiringSchedule upsert non-blocking notice for Ep ${scheduleItem.episodeNumber}: ${err.message}`,
          );
        }
      }
    }

    // 7. Process Relations (isolated in try-catch)
    if (payload.relations && Array.isArray(payload.relations)) {
      try {
        for (const rel of payload.relations) {
          if (!rel.targetAnilistId) continue;
          let targetId: number | null = null;
          const targetTypeStr = (rel.targetType || 'ANIME').toUpperCase();
          const targetType = (
            targetTypeStr in MediaType ? targetTypeStr : 'ANIME'
          ) as MediaType;

          if (targetType === MediaType.ANIME) {
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
          } else if (targetType === MediaType.MANGA) {
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
          }

          if (targetId) {
            const existingRel =
              await this.prisma.client.aquilaMediaRelationV2.findFirst({
                where: {
                  sourceType: MediaType.ANIME,
                  sourceId: animeLocalId,
                  targetType,
                  targetId,
                  type: rel.type || 'OTHER',
                },
              });
            if (!existingRel) {
              await this.prisma.client.aquilaMediaRelationV2.create({
                data: {
                  sourceType: MediaType.ANIME,
                  sourceId: animeLocalId,
                  targetType,
                  targetId,
                  type: rel.type || 'OTHER',
                },
              });
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `MediaRelationV2 upsert non-blocking notice: ${err.message}`,
        );
      }
    }

    return this.find(animeLocalId);
  }

  public async findSimilar(id: number): Promise<any[]> {
    const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(numericId)) return [];

    try {
      const target = await this.prisma.client.aquilaAnimeV2.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          titlePrimary: true,
          titleSecondary: true,
          titleNative: true,
          genres: true,
        },
      });

      if (!target) return [];

      const targetTitle = target.titlePrimary || target.titleSecondary || '';
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
        whereConditions.push({
          titlePrimary: { contains: titleKey, mode: 'insensitive' },
        });
        whereConditions.push({
          titleSecondary: { contains: titleKey, mode: 'insensitive' },
        });
      }

      const candidates = await this.prisma.client.aquilaAnimeV2.findMany({
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
          averageScore: true,
          format: true,
        },
        take: 40,
      });

      if (candidates.length < 6) {
        const fallback = await this.prisma.client.aquilaAnimeV2.findMany({
          where: { id: { not: numericId } },
          select: {
            id: true,
            titlePrimary: true,
            titleSecondary: true,
            coverImage: true,
            genres: true,
            averageScore: true,
            format: true,
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
        const itemTitle = (item.titlePrimary || item.titleSecondary || '').toLowerCase();
        if (titleKey && itemTitle.includes(titleKey.toLowerCase())) {
          score += 10;
        }
        if (target.genres && item.genres) {
          const overlap = item.genres.filter((g) => target.genres.includes(g)).length;
          score += overlap * 3;
        }
        if (item.averageScore) {
          score += item.averageScore / 2;
        }
        return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, 12).map(({ item }) => ({
        id: item.id,
        title: item.titlePrimary || item.titleSecondary || 'Untitled',
        coverImage: item.coverImage || null,
        type: 'ANIME',
      }));
    } catch (err: any) {
      this.logger.error(`Anime V2 findSimilar error: ${err.message}`);
      return [];
    }
  }
}
