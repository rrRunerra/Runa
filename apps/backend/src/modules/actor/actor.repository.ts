import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { ActorDetailEntity, ActorRoleAppearanceV2 } from './actor.entities';
import { rrError } from 'src/providers/error';
import { MediaType } from '@runa/database';

@Injectable()
export class ActorRepository {
  private readonly moduleCode = 'AcRpstry-';
  private readonly logger = new Logger(ActorRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async find(id: number): Promise<ActorDetailEntity | null> {
    this.logger.debug(`Fetching actor details for ID: ${id}`);
    try {
      const numericId = typeof id === 'number' ? id : Number(id);
      if (isNaN(numericId)) return null;

      let actor = await this.prisma.client.aquilaActorV2.findUnique({
        where: { id: numericId },
      });

      if (!actor) {
        actor = await this.prisma.client.aquilaActorV2.findUnique({
          where: { anilistId: numericId },
        });
      }

      if (!actor) return null;

      const [mediaChars, mediaStaff] = await Promise.all([
        this.prisma.client.aquilaMediaCharacterV2.findMany({
          where: { actorId: actor.id },
          include: { character: true },
        }),
        this.prisma.client.aquilaMediaStaffV2.findMany({
          where: { staffId: actor.id },
        }),
      ]);

      const roles: ActorRoleAppearanceV2[] = [];

      for (const mc of mediaChars) {
        const { titlePrimary, coverImage } = await this.getMediaTitleAndCover(
          mc.mediaType,
          mc.mediaId,
        );

        roles.push({
          id: mc.id,
          mediaType: mc.mediaType as any,
          mediaId: mc.mediaId,
          titlePrimary,
          coverImage,
          role: mc.role,
          customRole: null,
          characterName: mc.character.namePrimary,
          characterImage: mc.character.image,
        });
      }

      for (const ms of mediaStaff) {
        const { titlePrimary, coverImage } = await this.getMediaTitleAndCover(
          ms.mediaType,
          ms.mediaId,
        );

        roles.push({
          id: ms.id,
          mediaType: ms.mediaType as any,
          mediaId: ms.mediaId,
          titlePrimary,
          coverImage,
          role: ms.role,
          customRole: ms.customRole,
          characterName: null,
          characterImage: null,
        });
      }

      return {
        id: actor.id,
        anilistId: actor.anilistId,
        malId: actor.malId,
        tvDBId: actor.tvDBId,
        namePrimary: actor.namePrimary,
        nameNative: actor.nameNative,
        nameAlternative: actor.nameAlternative,
        image: actor.image,
        images: actor.images,
        description: actor.description,
        language: actor.language,
        roles,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch actor ${id} from database: ${err.message}`);
      throw new rrError(`${this.moduleCode}FTFA001`, {
        message: 'Failed to fetch actor details from database',
      });
    }
  }

  private async getMediaTitleAndCover(
    mediaType: MediaType | string,
    mediaId: number,
  ): Promise<{ titlePrimary: string; coverImage: string | null }> {
    let mediaTitle = 'Unknown';
    let coverImage: string | null = null;

    if (mediaType === MediaType.ANIME) {
      const a = await this.prisma.client.aquilaAnimeV2.findUnique({
        where: { id: mediaId },
        select: { titlePrimary: true, coverImage: true },
      });
      if (a) {
        mediaTitle = a.titlePrimary;
        coverImage = a.coverImage;
      }
    } else if (mediaType === MediaType.MANGA) {
      const m = await this.prisma.client.aquilaMangaV2.findUnique({
        where: { id: mediaId },
        select: { titlePrimary: true, coverImage: true },
      });
      if (m) {
        mediaTitle = m.titlePrimary;
        coverImage = m.coverImage;
      }
    } else if (mediaType === MediaType.MOVIE) {
      const mv = await this.prisma.client.aquilaMovieV2.findUnique({
        where: { id: mediaId },
        select: { titlePrimary: true, coverImage: true },
      });
      if (mv) {
        mediaTitle = mv.titlePrimary;
        coverImage = mv.coverImage;
      }
    } else if (mediaType === MediaType.TV) {
      const tv = await this.prisma.client.aquilaTvV2.findUnique({
        where: { id: mediaId },
        select: { titlePrimary: true, coverImage: true },
      });
      if (tv) {
        mediaTitle = tv.titlePrimary;
        coverImage = tv.coverImage;
      }
    } else if (mediaType === MediaType.BOOK) {
      const bk = await this.prisma.client.aquilaBookV2.findUnique({
        where: { id: mediaId },
        select: { titlePrimary: true, coverImage: true },
      });
      if (bk) {
        mediaTitle = bk.titlePrimary;
        coverImage = bk.coverImage;
      }
    } else if (mediaType === MediaType.GAME) {
      const gm = await this.prisma.client.aquilaGameV2.findUnique({
        where: { id: mediaId },
        select: { titlePrimary: true, coverImage: true },
      });
      if (gm) {
        mediaTitle = gm.titlePrimary;
        coverImage = gm.coverImage;
      }
    }

    return { titlePrimary: mediaTitle, coverImage };
  }

  public async search(query: string): Promise<any[]> {
    this.logger.debug(`Searching actors for query: ${query}`);
    try {
      const trimmed = query.trim();
      if (!trimmed) return [];

      const data = await this.prisma.client.aquilaActorV2.findMany({
        where: {
          OR: [
            { namePrimary: { contains: trimmed, mode: 'insensitive' } },
            { nameNative: { contains: trimmed, mode: 'insensitive' } },
            { nameAlternative: { has: trimmed } },
          ],
        },
        take: 30,
      });

      return data.map((item) => ({
        id: item.id,
        anilistId: item.anilistId,
        malId: item.malId,
        tvDBId: item.tvDBId,
        title: item.namePrimary,
        secondaryTitle: item.nameNative || null,
        coverImage: item.image || null,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to search actors: ${err.message}`);
      throw new rrError(`${this.moduleCode}SRCH001`, {
        message: 'Failed to search actors in database',
      });
    }
  }
}
