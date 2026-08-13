import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { MangaEntity, MangaSearchEntity } from './manga.entities';
import { CharacterRole, MediaType } from '@runa/database';
import { rrError } from 'src/providers/error';

@Injectable()
export class MangaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly moduleCode = 'MaRpstry-';
  private readonly logger = new Logger(MangaRepository.name);

  public async search(name: string): Promise<MangaSearchEntity[]> {
    this.logger.debug(`Searching for manga V2: "${name}" in local db`);
    try {
      const cleanName = name.trim();
      const records = await this.prisma.client.aquilaMangaV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: cleanName, mode: 'insensitive' } },
            { titleSecondary: { contains: cleanName, mode: 'insensitive' } },
            { titleNative: { contains: cleanName, mode: 'insensitive' } },
            { synonyms: { has: cleanName } },
          ],
        },
        orderBy: [{ popularity: 'desc' }, { alPopularity: 'desc' }],
        take: 30,
      });

      return records.map((item) => ({
        id: item.id,
        anilistId: item.anilistId || undefined,
        malId: item.malId || undefined,
        title: item.titlePrimary,
        secondaryTitle: item.titleSecondary || null,
        coverImage: item.coverImage || null,
        averageScore: item.averageScore || null,
        isAdult: item.isAdult || false,
        format: item.format,
        status: item.status,
      }));
    } catch {
      throw new rrError(`${this.moduleCode}FTFAFD001`, {
        message: 'Failed to fetch manga V2 from db',
      });
    }
  }

  public async find(id: number): Promise<MangaEntity | null> {
    const numericId = typeof id === 'number' ? id : Number(id);
    if (isNaN(numericId)) return null;

    const record = await this.prisma.client.aquilaMangaV2.findUnique({
      where: { id: numericId },
      include: {
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
        where: { sourceType: MediaType.MANGA, sourceId: numericId },
      });

      relations = await Promise.all(
        relationsRaw.map(async (r) => {
          let targetMedia: any = null;
          if (r.targetType === MediaType.MANGA) {
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
          } else if (r.targetType === MediaType.ANIME) {
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
      this.logger.warn(`Failed to fetch relations for manga ${numericId}: ${err.message}`);
    }

    return {
      ...record,
      relations,
    } as unknown as MangaEntity;
  }

  public async findByAnilistId(anilistId: number): Promise<any | null> {
    return this.prisma.client.aquilaMangaV2.findUnique({
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
      throw new Error('anilistId is required for manga V2 upsert');
    }

    const existing = await this.prisma.client.aquilaMangaV2.findUnique({
      where: { anilistId: payload.anilistId },
      select: { id: true, locked: true },
    });

    if (existing?.locked) {
      this.logger.debug(
        `Manga V2 with AniList ID ${payload.anilistId} is locked, skipping upsert`,
      );
      return existing;
    }

    // Ensure external unique IDs do not conflict
    let malId = payload.malId ?? null;
    let mangaUpdatesId = payload.mangaUpdatesId ?? null;

    if (malId) {
      const conflict = await this.prisma.client.aquilaMangaV2.findUnique({
        where: { malId },
        select: { id: true, anilistId: true },
      });
      if (conflict && conflict.anilistId !== payload.anilistId) {
        this.logger.warn(
          `malId ${malId} already belongs to another manga (ID ${conflict.id}), setting to null`,
        );
        malId = null;
      }
    }

    if (mangaUpdatesId) {
      const conflict = await this.prisma.client.aquilaMangaV2.findUnique({
        where: { mangaUpdatesId },
        select: { id: true, anilistId: true },
      });
      if (conflict && conflict.anilistId !== payload.anilistId) {
        mangaUpdatesId = null;
      }
    }

    // 1. Upsert main AquilaMangaV2 record
    const manga = await this.prisma.client.aquilaMangaV2.upsert({
      where: { anilistId: payload.anilistId },
      update: {
        malId: malId ?? undefined,
        mangaUpdatesId: mangaUpdatesId ?? undefined,

        titlePrimary: payload.titlePrimary,
        titleSecondary: payload.titleSecondary,
        titleNative: payload.titleNative,

        coverImage: payload.coverImage,
        bannerImage: payload.bannerImage,
        images: payload.images ?? undefined,

        description: payload.description,
        hashtag: payload.hashtag,
        countryOfOrigin: payload.countryOfOrigin,

        volumeCount: payload.volumeCount,
        chapterCount: payload.chapterCount,

        serialization: payload.serialization,
        imprint: payload.imprint,
        publishers: payload.publishers || [],
        demographics: payload.demographics || [],
        readingDirection: payload.readingDirection || 'RIGHT_TO_LEFT',

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

        averageScore: null,
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

        siteUrl: payload.siteUrl,
        externalLinks: payload.externalLinks ?? undefined,
        sources: payload.sources ?? undefined,

        alUpdatedAt: payload.alUpdatedAt,
        malUpdatedAt: payload.malUpdatedAt,
      },
      create: {
        anilistId: payload.anilistId,
        malId,
        mangaUpdatesId,

        titlePrimary: payload.titlePrimary,
        titleSecondary: payload.titleSecondary,
        titleNative: payload.titleNative,

        coverImage: payload.coverImage,
        bannerImage: payload.bannerImage,
        images: payload.images,

        description: payload.description,
        hashtag: payload.hashtag,
        countryOfOrigin: payload.countryOfOrigin,

        volumeCount: payload.volumeCount,
        chapterCount: payload.chapterCount,

        serialization: payload.serialization,
        imprint: payload.imprint,
        publishers: payload.publishers || [],
        demographics: payload.demographics || [],
        readingDirection: payload.readingDirection || 'RIGHT_TO_LEFT',

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

        siteUrl: payload.siteUrl,
        externalLinks: payload.externalLinks,
        sources: payload.sources,

        alUpdatedAt: payload.alUpdatedAt,
        malUpdatedAt: payload.malUpdatedAt,
      },
    });

    const mangaLocalId = manga.id;

    // 2. Process Studios / Publishers using local IDs (isolated in try-catch)
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
              name: st.name,
              isAnimationStudio: st.isAnimationStudio || false,
              siteUrl: st.siteUrl || null,
              alFavorites: st.alFavorites || null,
            },
          });

          await this.prisma.client.aquilaMediaStudioV2.upsert({
            where: {
              mediaType_mediaId_studioId: {
                mediaType: MediaType.MANGA,
                mediaId: mangaLocalId,
                studioId: studioRecord.id,
              },
            },
            update: { isMain: st.isMain || false },
            create: {
              mediaType: MediaType.MANGA,
              mediaId: mangaLocalId,
              studioId: studioRecord.id,
              isMain: st.isMain || false,
            },
          });
        } catch (err: any) {
          this.logger.warn(`Studio upsert non-blocking notice for "${st.name}": ${err.message}`);
        }
      }
    }

    // 3. Process Characters using local IDs (isolated in try-catch)
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

          const charRole = (
            ch.role === 'SUPPORTING' || ch.role === 'BACKGROUND' ? ch.role : 'MAIN'
          ) as CharacterRole;

          try {
            await this.prisma.client.aquilaMediaCharacterV2.upsert({
              where: {
                mediaType_mediaId_characterId_actorId: {
                  mediaType: MediaType.MANGA,
                  mediaId: mangaLocalId,
                  characterId: charRecord.id,
                  actorId: 0,
                },
              },
              update: {
                role: charRole,
                order: orderIndex + 1,
                mangaId: mangaLocalId,
              },
              create: {
                mediaType: MediaType.MANGA,
                mediaId: mangaLocalId,
                mangaId: mangaLocalId,
                characterId: charRecord.id,
                actorId: null,
                role: charRole,
                order: orderIndex + 1,
              },
            });
          } catch (err: any) {
            this.logger.warn(
              `MediaCharacterV2 upsert non-blocking notice for "${ch.namePrimary}": ${err.message}`,
            );
          }
        } catch (err: any) {
          this.logger.warn(
            `CharacterV2 upsert non-blocking notice for "${ch.namePrimary}": ${err.message}`,
          );
        }
      }
    }

    // 4. Process Staff (Authors/Artists) using local IDs (isolated in try-catch)
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
                mediaType: MediaType.MANGA,
                mediaId: mangaLocalId,
                staffId: staffRecord.id,
                role: st.role,
              },
            },
            update: { customRole: st.customRole || null, mangaId: mangaLocalId },
            create: {
              mediaType: MediaType.MANGA,
              mediaId: mangaLocalId,
              mangaId: mangaLocalId,
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

    // 5. Process Relations (isolated in try-catch)
    if (payload.relations && Array.isArray(payload.relations)) {
      try {
        await this.prisma.client.aquilaMediaRelationV2.deleteMany({
          where: { sourceType: MediaType.MANGA, sourceId: mangaLocalId },
        });

        for (const rel of payload.relations) {
          if (!rel.targetAnilistId) continue;
          if (rel.type === 'OTHER') {
            continue;
          }
          let targetId: number | null = null;
          const targetTypeStr = (rel.targetType || 'MANGA').toUpperCase();
          const targetType = (
            targetTypeStr in MediaType ? targetTypeStr : 'MANGA'
          ) as MediaType;

          if (targetType === MediaType.MANGA) {
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
          } else if (targetType === MediaType.ANIME) {
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
          }

          if (targetId) {
            const existingRel =
              await this.prisma.client.aquilaMediaRelationV2.findFirst({
                where: {
                  sourceType: MediaType.MANGA,
                  sourceId: mangaLocalId,
                  targetType,
                  targetId,
                  type: rel.type || 'OTHER',
                },
              });
            if (!existingRel) {
              await this.prisma.client.aquilaMediaRelationV2.create({
                data: {
                  sourceType: MediaType.MANGA,
                  sourceId: mangaLocalId,
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

    return this.find(mangaLocalId);
  }

  public async findSimilar(id: any): Promise<any[]> {
    const numericId = typeof id === 'number' ? id : parseInt(String(id), 10);
    if (isNaN(numericId)) return [];

    try {
      const target = await this.prisma.client.aquilaMangaV2.findUnique({
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

      const targetTitle = target.titlePrimary || target.titleSecondary || target.titleNative || '';
      const firstWord = targetTitle.trim().split(/\s+/)[0]?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      const titleKey = firstWord && firstWord.length >= 2 ? firstWord : null;

      const whereConditions: any[] = [];
      if (target.genres && target.genres.length > 0) {
        whereConditions.push({ genres: { hasSome: target.genres } });
      }
      if (titleKey) {
        whereConditions.push({ titlePrimary: { contains: titleKey, mode: 'insensitive' } });
        whereConditions.push({ titleSecondary: { contains: titleKey, mode: 'insensitive' } });
      }

      const candidates = await this.prisma.client.aquilaMangaV2.findMany({
        where: {
          id: { not: numericId },
          ...(whereConditions.length > 0 ? { OR: whereConditions } : {}),
        },
        select: {
          id: true,
          titlePrimary: true,
          titleSecondary: true,
          titleNative: true,
          coverImage: true,
          genres: true,
          alAverageScore: true,
          format: true,
        },
        take: 40,
      });

      if (candidates.length < 6) {
        const fallback = await this.prisma.client.aquilaMangaV2.findMany({
          where: { id: { not: numericId } },
          select: {
            id: true,
            titlePrimary: true,
            titleSecondary: true,
            titleNative: true,
            coverImage: true,
            genres: true,
            alAverageScore: true,
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
        const itemTitle = (item.titlePrimary || item.titleSecondary || item.titleNative || '').toLowerCase();
        if (titleKey && itemTitle.includes(titleKey.toLowerCase())) {
          score += 10;
        }
        if (target.genres && item.genres) {
          const overlap = item.genres.filter((g) => target.genres.includes(g)).length;
          score += overlap * 3;
        }
        if (item.alAverageScore) {
          score += item.alAverageScore / 20;
        }
        return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, 12).map(({ item }) => ({
        id: item.id,
        title: item.titlePrimary || item.titleSecondary || item.titleNative || 'Untitled',
        coverImage: item.coverImage || null,
        type: 'MANGA',
      }));
    } catch (err) {
      this.logger.error(`Manga findSimilar error: ${err}`);
      return [];
    }
  }
}
