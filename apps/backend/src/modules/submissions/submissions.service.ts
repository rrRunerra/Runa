import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CreateSubmissionDto } from './dto/submission.dto';
import { BitField, AquilaFlags, RunaFlags } from '@runa/permissions';

const MANAGE_FLAG_MAP: Record<string, bigint> = {
  anime: AquilaFlags.MANAGE_ANIME,
  manga: AquilaFlags.MANAGE_MANGA,
  movie: AquilaFlags.MANAGE_MOVIE,
  tv: AquilaFlags.MANAGE_TV,
  game: AquilaFlags.MANAGE_GAME,
  book: AquilaFlags.MANAGE_BOOK,
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
        titleEnglish: data.titleEnglish || null,
        titleRomaji: data.titleRomaji || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImageLarge: data.coverImageLarge || data.coverImage || null,
        bannerImage: data.bannerImage || null,
        format: data.format || 'UNKNOWN',
        status: data.status || 'NOT_YET_RELEASED',
        episodes: data.episodes ? Number(data.episodes) : null,
        duration: data.duration ? Number(data.duration) : null,
        source: data.source || null,
        season: data.season || null,
        seasonYear: data.seasonYear ? Number(data.seasonYear) : null,
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
        const updated = await this.prisma.client.aquilaAnime.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaAnime.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'manga') {
      const payload: any = {
        titleEnglish: data.titleEnglish || null,
        titleRomaji: data.titleRomaji || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImageLarge: data.coverImageLarge || data.coverImage || null,
        bannerImage: data.bannerImage || null,
        format: data.format || 'UNKNOWN',
        status: data.status || 'NOT_YET_RELEASED',
        chapters: data.chapters ? Number(data.chapters) : null,
        volumes: data.volumes ? Number(data.volumes) : null,
        source: data.source || null,
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
        const updated = await this.prisma.client.aquilaManga.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaManga.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'tv') {
      const payload: any = {
        titleEnglish: data.titleEnglish || null,
        titleRomaji: data.titleRomaji || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        bannerImage: data.bannerImage || null,
        status: data.status || null,
        averageRuntime: data.averageRuntime ? Number(data.averageRuntime) : null,
        firstAired: data.firstAired || null,
        originalCountry: data.originalCountry || null,
        originalLanguage: data.originalLanguage || null,
        contentRating: data.contentRating || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        studios: Array.isArray(data.studios) ? data.studios : [],
        tvdbId: data.tvdbId ? Number(data.tvdbId) : Math.floor(Date.now() / 1000),
        locked: true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaTv.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaTv.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'movie') {
      const payload: any = {
        titleEnglish: data.titleEnglish || null,
        titleRomaji: data.titleRomaji || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        bannerImage: data.bannerImage || null,
        status: data.status || null,
        releaseDate: data.releaseDate || null,
        runtime: data.runtime ? Number(data.runtime) : null,
        budget: data.budget || null,
        boxOffice: data.boxOffice || null,
        originalCountry: data.originalCountry || null,
        originalLanguage: data.originalLanguage || null,
        contentRating: data.contentRating || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        studios: Array.isArray(data.studios) ? data.studios : [],
        tvdbId: data.tvdbId ? Number(data.tvdbId) : Math.floor(Date.now() / 1000),
        locked: true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaMovie.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaMovie.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'game') {
      const payload: any = {
        titleString: data.titleString || data.titleEnglish || null,
        titleNative: data.titleNative || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        backgroundImage: data.backgroundImage || data.bannerImage || null,
        released: data.released || null,
        releasedYear: data.releasedYear ? Number(data.releasedYear) : null,
        esrbRating: data.esrbRating || null,
        genres: Array.isArray(data.genres) ? data.genres : [],
        platforms: Array.isArray(data.platforms) ? data.platforms : [],
        developers: Array.isArray(data.developers) ? data.developers : [],
        publishers: Array.isArray(data.publishers) ? data.publishers : [],
        rawgId: data.rawgId ? Number(data.rawgId) : Math.floor(Date.now() / 1000),
        locked: true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaGame.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaGame.create({ data: payload });
        targetMediaId = created.id;
      }
    } else if (type === 'book') {
      const payload: any = {
        titleString: data.titleString || data.titleEnglish || null,
        subtitle: data.subtitle || null,
        description: data.description || null,
        coverImage: data.coverImage || null,
        publishedDate: data.publishedDate || null,
        publishedYear: data.publishedYear ? Number(data.publishedYear) : null,
        pageCount: data.pageCount ? Number(data.pageCount) : null,
        chapters: data.chapters ? Number(data.chapters) : null,
        language: data.language || null,
        isbn10: data.isbn10 || null,
        isbn13: data.isbn13 || null,
        subjects: Array.isArray(data.subjects) ? data.subjects : Array.isArray(data.genres) ? data.genres : [],
        authors: Array.isArray(data.authors) ? data.authors : [],
        artists: Array.isArray(data.artists) ? data.artists : [],
        publishers: Array.isArray(data.publishers) ? data.publishers : [],
        googleBookId: data.googleBookId || `custom_${Date.now()}`,
        locked: true,
      };

      if (actionType === 'EDIT' && mediaId) {
        const updated = await this.prisma.client.aquilaBook.update({ where: { id: mediaId }, data: payload });
        targetMediaId = updated.id;
      } else {
        const created = await this.prisma.client.aquilaBook.create({ data: payload });
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

    return this.prisma.client.aquilaCharacter.findMany({
      where: {
        OR: [
          { nameFirst: { contains: trimmed, mode: 'insensitive' } },
          { nameMiddle: { contains: trimmed, mode: 'insensitive' } },
          { nameLast: { contains: trimmed, mode: 'insensitive' } },
          { nameNative: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        nameFirst: true,
        nameMiddle: true,
        nameLast: true,
        nameNative: true,
        image: true,
      },
      take: 20,
    });
  }

  async searchActors(query: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    return this.prisma.client.aquilaActor.findMany({
      where: {
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { personName: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  }

  async searchRelations(mediaType: string, query: string) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];
    const type = (mediaType || 'anime').toLowerCase();

    if (type === 'anime') {
      return this.prisma.client.aquilaAnime.findMany({
        where: {
          OR: [
            { titleEnglish: { contains: trimmed, mode: 'insensitive' } },
            { titleRomaji: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titleEnglish: true, titleRomaji: true, coverImageLarge: true },
        take: 20,
      });
    } else if (type === 'manga') {
      return this.prisma.client.aquilaManga.findMany({
        where: {
          OR: [
            { titleEnglish: { contains: trimmed, mode: 'insensitive' } },
            { titleRomaji: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titleEnglish: true, titleRomaji: true, coverImageLarge: true },
        take: 20,
      });
    } else if (type === 'tv') {
      return this.prisma.client.aquilaTv.findMany({
        where: {
          OR: [
            { titleEnglish: { contains: trimmed, mode: 'insensitive' } },
            { titleRomaji: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titleEnglish: true, titleRomaji: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'movie') {
      return this.prisma.client.aquilaMovie.findMany({
        where: {
          OR: [
            { titleEnglish: { contains: trimmed, mode: 'insensitive' } },
            { titleRomaji: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titleEnglish: true, titleRomaji: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'game') {
      return this.prisma.client.aquilaGame.findMany({
        where: {
          OR: [
            { titleString: { contains: trimmed, mode: 'insensitive' } },
            { titleNative: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titleString: true, titleNative: true, coverImage: true },
        take: 20,
      });
    } else if (type === 'book') {
      return this.prisma.client.aquilaBook.findMany({
        where: {
          OR: [
            { titleString: { contains: trimmed, mode: 'insensitive' } },
            { subtitle: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, titleString: true, subtitle: true, coverImage: true },
        take: 20,
      });
    }
    return [];
  }

  private async saveCharacters(mediaType: string, mediaId: number, characters: any[]) {
    if (!Array.isArray(characters)) return;
    const type = mediaType.toLowerCase();

    if (type === 'anime') {
      await this.prisma.client.aquilaAnimeCharacter.deleteMany({ where: { animeId: mediaId } }).catch(() => null);
      for (const char of characters) {
        if (!char.characterId) continue;
        await this.prisma.client.aquilaAnimeCharacter.create({
          data: {
            animeId: mediaId,
            characterId: Number(char.characterId),
            voiceActorId: char.voiceActorId ? Number(char.voiceActorId) : null,
            role: char.role || 'MAIN',
          },
        }).catch(() => null);
      }
    } else if (type === 'manga') {
      await this.prisma.client.aquilaMangaCharacter.deleteMany({ where: { mangaId: mediaId } }).catch(() => null);
      for (const char of characters) {
        if (!char.characterId) continue;
        await this.prisma.client.aquilaMangaCharacter.create({
          data: {
            mangaId: mediaId,
            characterId: Number(char.characterId),
            role: char.role || 'MAIN',
          },
        }).catch(() => null);
      }
    } else if (type === 'tv') {
      await this.prisma.client.aquilaTvCharacter.deleteMany({ where: { tvId: mediaId } }).catch(() => null);
      for (const char of characters) {
        if (!char.characterId) continue;
        await this.prisma.client.aquilaTvCharacter.create({
          data: {
            tvId: mediaId,
            characterId: Number(char.characterId),
            actorId: char.actorId ? Number(char.actorId) : null,
            role: char.role || 'MAIN',
          },
        }).catch(() => null);
      }
    } else if (type === 'movie') {
      await this.prisma.client.aquilaMovieCharacter.deleteMany({ where: { movieId: mediaId } }).catch(() => null);
      for (const char of characters) {
        if (!char.characterId) continue;
        await this.prisma.client.aquilaMovieCharacter.create({
          data: {
            movieId: mediaId,
            characterId: Number(char.characterId),
            actorId: char.actorId ? Number(char.actorId) : null,
            role: char.role || 'MAIN',
          },
        }).catch(() => null);
      }
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

    if (type === 'anime') {
      await this.prisma.client.aquilaMediaRelation.deleteMany({ where: { animeId: mediaId } }).catch(() => null);
      for (const rel of relations) {
        if (!rel.relatedMediaId) continue;
        const targetId = Number(rel.relatedMediaId);
        const relType = rel.relationType || 'SEQUEL';
        const reciprocalType = this.getReciprocalRelationType(relType);

        // 1. Forward relation: Current Anime -> Target Anime
        await this.prisma.client.aquilaMediaRelation.create({
          data: {
            animeId: mediaId,
            relatedAnimeId: targetId,
            relationType: relType,
          },
        }).catch(() => null);

        // 2. Reciprocal relation: Target Anime -> Current Anime
        await this.prisma.client.aquilaMediaRelation.deleteMany({
          where: { animeId: targetId, relatedAnimeId: mediaId },
        }).catch(() => null);

        await this.prisma.client.aquilaMediaRelation.create({
          data: {
            animeId: targetId,
            relatedAnimeId: mediaId,
            relationType: reciprocalType,
          },
        }).catch(() => null);
      }
    } else if (type === 'manga') {
      await this.prisma.client.aquilaMediaRelation.deleteMany({ where: { mangaId: mediaId } }).catch(() => null);
      for (const rel of relations) {
        if (!rel.relatedMediaId) continue;
        const targetId = Number(rel.relatedMediaId);
        const relType = rel.relationType || 'SEQUEL';
        const reciprocalType = this.getReciprocalRelationType(relType);

        // 1. Forward relation: Current Manga -> Target Manga
        await this.prisma.client.aquilaMediaRelation.create({
          data: {
            mangaId: mediaId,
            relatedMangaId: targetId,
            relationType: relType,
          },
        }).catch(() => null);

        // 2. Reciprocal relation: Target Manga -> Current Manga
        await this.prisma.client.aquilaMediaRelation.deleteMany({
          where: { mangaId: targetId, relatedMangaId: mediaId },
        }).catch(() => null);

        await this.prisma.client.aquilaMediaRelation.create({
          data: {
            mangaId: targetId,
            relatedMangaId: mediaId,
            relationType: reciprocalType,
          },
        }).catch(() => null);
      }
    }
  }
}
