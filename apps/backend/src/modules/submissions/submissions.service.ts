import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CreateSubmissionDto } from './dto/submission.dto';
import { BitField, AquilaFlags, RunaFlags } from '@runa/permissions';
import { MediaType, CharacterRole, RelationType } from '@runa/database';

const MANAGE_FLAG_MAP: Record<string, bigint> = {
  anime: AquilaFlags.MANAGE_ANIME,
  manga: AquilaFlags.MANAGE_MANGA,
  movie: AquilaFlags.MANAGE_MOVIE,
  tv: AquilaFlags.MANAGE_TV,
  game: AquilaFlags.MANAGE_GAME,
  book: AquilaFlags.MANAGE_BOOK,
};

const MEDIA_TYPE_MAP: Record<string, MediaType> = {
  anime: MediaType.ANIME,
  manga: MediaType.MANGA,
  movie: MediaType.MOVIE,
  tv: MediaType.TV,
  game: MediaType.GAME,
  book: MediaType.BOOK,
};

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  canUserManage(mediaType: string, userPermissions: number[] = []): boolean {
    const bitfield = new BitField(userPermissions);
    if (bitfield.has(RunaFlags.ADMINISTRATOR) || bitfield.has(AquilaFlags.MANAGE)) {
      return true;
    }
    const typeFlag = MANAGE_FLAG_MAP[mediaType.toLowerCase()];
    return typeFlag ? bitfield.has(typeFlag) : false;
  }

  async createSubmission(
    userId: string,
    dto: CreateSubmissionDto,
    userPermissions: number[] = [],
  ) {
    const canBypass = this.canUserManage(dto.mediaType, userPermissions);

    if (canBypass) {
      const mediaId = await this.applyMediaData(dto.mediaType, dto.actionType, dto.mediaId, dto.data);
      const submission = await this.prisma.client.aquilaMediaSubmission.create({
        data: {
          mediaType: dto.mediaType,
          actionType: dto.actionType,
          mediaId: mediaId,
          data: dto.data,
          status: 'APPROVED',
          submittedById: userId,
          reviewedById: userId,
        },
      });
      return { status: 'APPROVED', appliedDirectly: true, submission, mediaId };
    } else {
      const submission = await this.prisma.client.aquilaMediaSubmission.create({
        data: {
          mediaType: dto.mediaType,
          actionType: dto.actionType,
          mediaId: dto.mediaId,
          data: dto.data,
          status: 'PENDING',
          submittedById: userId,
        },
      });
      return { status: 'PENDING', appliedDirectly: false, submission };
    }
  }

  async getPendingSubmissions(mediaType?: string) {
    const where: any = { status: 'PENDING' };
    if (mediaType) {
      where.mediaType = mediaType.toLowerCase();
    }
    return this.prisma.client.aquilaMediaSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async approveSubmission(submissionId: string, reviewerId: string) {
    const submission = await this.prisma.client.aquilaMediaSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.status !== 'PENDING') {
      throw new BadRequestException(`Submission is already ${submission.status}`);
    }

    const appliedMediaId = await this.applyMediaData(
      submission.mediaType,
      submission.actionType,
      submission.mediaId,
      submission.data as Record<string, any>,
    );

    const updated = await this.prisma.client.aquilaMediaSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'APPROVED',
        reviewedById: reviewerId,
        mediaId: appliedMediaId,
      },
    });

    return updated;
  }

  async rejectSubmission(submissionId: string, reviewerId: string, rejectionReason?: string) {
    const submission = await this.prisma.client.aquilaMediaSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found`);
    }

    if (submission.status !== 'PENDING') {
      throw new BadRequestException(`Submission is already ${submission.status}`);
    }

    const updated = await this.prisma.client.aquilaMediaSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        reviewedById: reviewerId,
        rejectionReason: rejectionReason || null,
      },
    });

    return updated;
  }

  private async applyMediaData(
    mediaType: string,
    actionType: string,
    mediaId?: number | null,
    data: Record<string, any> = {},
  ): Promise<number> {
    const type = mediaType.toLowerCase();
    let targetMediaId: number;

    if (type === 'anime') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleEnglish || 'Untitled',
        titleSecondary: data.titleSecondary || data.titleRomaji || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImage: data.coverImageLarge || data.coverImage || null,
        bannerImage: data.bannerImage || null,
        format: data.format || 'UNKNOWN',
        status: data.status || 'UNKNOWN',
        episodeCount: data.episodes ? Number(data.episodes) : data.episodeCount ? Number(data.episodeCount) : null,
        episodeDuration: data.duration ? Number(data.duration) : data.episodeDuration ? Number(data.episodeDuration) : null,
        source: data.source || 'UNKNOWN',
        seasonSeason: data.seasonSeason || data.season || 'UNKNOWN',
        seasonYear: data.seasonYear ? Number(data.seasonYear) : data.startDateYear ? Number(data.startDateYear) : 2000,
        startDateYear: data.startDateYear ? Number(data.startDateYear) : 2000,
        startDateMonth: data.startDateMonth ? Number(data.startDateMonth) : null,
        startDateDay: data.startDateDay ? Number(data.startDateDay) : null,
        endDateYear: data.endDateYear ? Number(data.endDateYear) : null,
        endDateMonth: data.endDateMonth ? Number(data.endDateMonth) : null,
        endDateDay: data.endDateDay ? Number(data.endDateDay) : null,
        isAdult: typeof data.isAdult === 'boolean' ? data.isAdult : false,
        hashtag: data.hashtag || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        countryOfOrigin: data.countryOfOrigin || null,
        locked: true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaAnimeV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaAnimeV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'manga') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleEnglish || 'Untitled',
        titleSecondary: data.titleSecondary || data.titleRomaji || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImage: data.coverImageLarge || data.coverImage || null,
        bannerImage: data.bannerImage || null,
        format: data.format || 'UNKNOWN',
        status: data.status || 'UNKNOWN',
        chapterCount: data.chapters ? Number(data.chapters) : data.chapterCount ? Number(data.chapterCount) : null,
        volumeCount: data.volumes ? Number(data.volumes) : data.volumeCount ? Number(data.volumeCount) : null,
        source: data.source || 'UNKNOWN',
        startDateYear: data.startDateYear ? Number(data.startDateYear) : null,
        startDateMonth: data.startDateMonth ? Number(data.startDateMonth) : null,
        startDateDay: data.startDateDay ? Number(data.startDateDay) : null,
        endDateYear: data.endDateYear ? Number(data.endDateYear) : null,
        endDateMonth: data.endDateMonth ? Number(data.endDateMonth) : null,
        endDateDay: data.endDateDay ? Number(data.endDateDay) : null,
        isAdult: typeof data.isAdult === 'boolean' ? data.isAdult : false,
        hashtag: data.hashtag || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        countryOfOrigin: data.countryOfOrigin || null,
        locked: true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaMangaV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaMangaV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'tv') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleEnglish || 'Untitled',
        titleSecondary: data.titleSecondary || data.titleRomaji || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        bannerImage: data.bannerImage || null,
        status: data.status || 'UNKNOWN',
        averageRuntime: data.averageRuntime ? Number(data.averageRuntime) : null,
        countryOfOrigin: data.countryOfOrigin || data.originalCountry || null,
        originalLanguage: data.originalLanguage || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        studios: Array.isArray(data.studios) ? data.studios : [],
        tvDBId: data.tvDBId || data.tvdbId ? Number(data.tvDBId || data.tvdbId) : Math.floor(Date.now() / 1000),
        locked: true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaTvV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaTvV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'movie') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleEnglish || 'Untitled',
        titleSecondary: data.titleSecondary || data.titleRomaji || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        bannerImage: data.bannerImage || null,
        status: data.status || 'RELEASED',
        runtime: data.runtime ? Number(data.runtime) : null,
        budget: data.budget ? BigInt(data.budget) : null,
        revenue: data.boxOffice || data.revenue ? BigInt(data.boxOffice || data.revenue) : null,
        countryOfOrigin: data.countryOfOrigin || data.originalCountry || null,
        originalLanguage: data.originalLanguage || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        studios: Array.isArray(data.studios) ? data.studios : [],
        tvDBId: data.tvDBId || data.tvdbId ? Number(data.tvDBId || data.tvdbId) : Math.floor(Date.now() / 1000),
        locked: true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaMovieV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaMovieV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'game') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleString || data.titleEnglish || 'Untitled',
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        backgroundImage: data.backgroundImage || data.bannerImage || null,
        releaseDateYear: data.releaseDateYear ? Number(data.releaseDateYear) : data.releasedYear ? Number(data.releasedYear) : null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        platforms: Array.isArray(data.platforms) ? data.platforms : [],
        developers: Array.isArray(data.developers) ? data.developers : [],
        publishers: Array.isArray(data.publishers) ? data.publishers : [],
        rawgId: data.rawgId ? Number(data.rawgId) : Math.floor(Date.now() / 1000),
        locked: true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaGameV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaGameV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'book') {
      const payload: any = {
        titlePrimary: data.titlePrimary || data.titleString || data.titleEnglish || 'Untitled',
        subtitle: data.subtitle || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        releaseDateYear: data.releaseDateYear ? Number(data.releaseDateYear) : data.publishedYear ? Number(data.publishedYear) : null,
        pageCount: data.pageCount ? Number(data.pageCount) : null,
        chapterCount: data.chapters ? Number(data.chapters) : data.chapterCount ? Number(data.chapterCount) : null,
        originalLanguage: data.language || data.originalLanguage || null,
        isbn10: data.isbn10 || null,
        isbn13: data.isbn13 || null,
        subjects: Array.isArray(data.subjects) ? data.subjects : Array.isArray(data.genres) ? data.genres : [],
        authors: Array.isArray(data.authors) ? data.authors : [],
        publishers: Array.isArray(data.publishers) ? data.publishers : [],
        googleBookId: data.googleBookId || `custom_${Date.now()}`,
        locked: true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaBookV2.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaBookV2.create({ data: payload });
        targetMediaId = created.id;
      }
    } else {
      throw new BadRequestException(`Unsupported mediaType: ${mediaType}`);
    }

    await this.saveCharacters(type, targetMediaId, data.characters);
    await this.saveRelations(type, targetMediaId, data.relations);

    return targetMediaId;
  }

  // Search endpoints for modal auto-completers
  async searchCharacters(query: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    return this.prisma.client.aquilaCharacterV2.findMany({
      where: {
        OR: [
          { namePrimary: { contains: trimmed, mode: 'insensitive' } },
          { nameNative: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        namePrimary: true,
        nameNative: true,
        image: true,
      },
      take: 20,
    });
  }

  async searchActors(query: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    return this.prisma.client.aquilaActorV2.findMany({
      where: {
        OR: [
          { namePrimary: { contains: trimmed, mode: 'insensitive' } },
          { nameNative: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        namePrimary: true,
        nameNative: true,
        image: true,
      },
      take: 20,
    });
  }

  async searchRelations(mediaType: string, query: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];
    const type = (mediaType || 'anime').toLowerCase();

    if (type === 'anime') {
      return this.prisma.client.aquilaAnimeV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { titleSecondary: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'manga') {
      return this.prisma.client.aquilaMangaV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { titleSecondary: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'tv') {
      return this.prisma.client.aquilaTvV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { titleSecondary: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'movie') {
      return this.prisma.client.aquilaMovieV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { titleSecondary: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'game') {
      return this.prisma.client.aquilaGameV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, titleNative: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'book') {
      return this.prisma.client.aquilaBookV2.findMany({
        where: {
          OR: [
            { titlePrimary: { contains: trimmed, mode: 'insensitive' } },
            { subtitle: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titlePrimary: true, subtitle: true, coverImage: true },
        take: 20,
      });
    }
    return [];
  }

  private async saveCharacters(mediaType: string, mediaId: number, characters: any[]) {
    if (!Array.isArray(characters)) return;
    const type = mediaType.toLowerCase();
    const mediaEnum = MEDIA_TYPE_MAP[type];
    if (!mediaEnum) return;

    await this.prisma.client.aquilaMediaCharacterV2.deleteMany({
      where: { mediaType: mediaEnum, mediaId },
    }).catch(() => null);

    for (const char of characters) {
      if (!char.characterId) continue;
      const charRoleStr = char.role ? String(char.role).toUpperCase() : '';
      const charRole = ['MAIN', 'SUPPORTING', 'BACKGROUND'].includes(charRoleStr)
        ? (charRoleStr as CharacterRole)
        : CharacterRole.MAIN;

      await this.prisma.client.aquilaMediaCharacterV2.create({
        data: {
          mediaType: mediaEnum,
          mediaId,
          animeId: mediaEnum === MediaType.ANIME ? mediaId : null,
          mangaId: mediaEnum === MediaType.MANGA ? mediaId : null,
          movieId: mediaEnum === MediaType.MOVIE ? mediaId : null,
          tvId: mediaEnum === MediaType.TV ? mediaId : null,
          gameId: mediaEnum === MediaType.GAME ? mediaId : null,
          bookId: mediaEnum === MediaType.BOOK ? mediaId : null,
          characterId: Number(char.characterId),
          actorId: char.voiceActorId || char.actorId ? Number(char.voiceActorId || char.actorId) : null,
          role: charRole,
        },
      }).catch(() => null);
    }
  }

  private getReciprocalRelationType(relationType: string): string {
    switch (relationType) {
      case 'SEQUEL':
        return 'PREQUEL';
      case 'PREQUEL':
        return 'SEQUEL';
      case 'ADAPTATION':
        return 'ADAPTATION';
      case 'SIDE_STORY':
        return 'PARENT';
      case 'SPIN_OFF':
        return 'PARENT';
      case 'ALTERNATIVE':
        return 'ALTERNATIVE';
      case 'PARENT':
        return 'SIDE_STORY';
      default:
        return 'OTHER';
    }
  }

  private async saveRelations(mediaType: string, mediaId: number, relations: any[]) {
    if (!Array.isArray(relations)) return;
    const type = mediaType.toLowerCase();
    const mediaEnum = MEDIA_TYPE_MAP[type];
    if (!mediaEnum) return;

    await this.prisma.client.aquilaMediaRelationV2.deleteMany({
      where: { sourceType: mediaEnum, sourceId: mediaId },
    }).catch(() => null);

    for (const rel of relations) {
      if (!rel.relatedMediaId) continue;
      const targetId = Number(rel.relatedMediaId);
      const targetTypeStr = (rel.targetType || type).toLowerCase();
      const targetEnum = MEDIA_TYPE_MAP[targetTypeStr] || mediaEnum;

      const relTypeStr = (rel.relationType || 'SEQUEL').toUpperCase();
      const relType = relTypeStr in RelationType ? (relTypeStr as RelationType) : RelationType.OTHER;

      const reciprocalTypeStr = this.getReciprocalRelationType(relTypeStr);
      const reciprocalType = reciprocalTypeStr in RelationType ? (reciprocalTypeStr as RelationType) : RelationType.OTHER;

      // 1. Forward relation: Source Media -> Target Media
      await this.prisma.client.aquilaMediaRelationV2.create({
        data: {
          sourceType: mediaEnum,
          sourceId: mediaId,
          targetType: targetEnum,
          targetId: targetId,
          type: relType,
        },
      }).catch(() => null);

      // 2. Reciprocal relation: Target Media -> Source Media
      await this.prisma.client.aquilaMediaRelationV2.deleteMany({
        where: {
          sourceType: targetEnum,
          sourceId: targetId,
          targetType: mediaEnum,
          targetId: mediaId,
        },
      }).catch(() => null);

      await this.prisma.client.aquilaMediaRelationV2.create({
        data: {
          sourceType: targetEnum,
          sourceId: targetId,
          targetType: mediaEnum,
          targetId: mediaId,
          type: reciprocalType,
        },
      }).catch(() => null);
    }
  }
}
