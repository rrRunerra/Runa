import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { MediaType } from '@runa/database';
import {
  CharacterDetailEntity,
  CharacterMediaAppearance,
  CharacterSearchEntity,
} from './character.entities';
import { rrError } from 'src/providers/error';

@Injectable()
export class CharacterRepository {
  private readonly moduleCode = 'ChRpstry-';
  private readonly logger = new Logger(CharacterRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async find(id: number): Promise<CharacterDetailEntity | null> {
    this.logger.debug(`Fetching V2 character details for ID: ${id}`);
    try {
      let char = await this.prisma.client.aquilaCharacterV2.findUnique({
        where: { id },
        include: {
          mediaCharacters: {
            include: {
              actor: true,
            },
          },
        },
      });

      if (!char) {
        char = await this.prisma.client.aquilaCharacterV2.findUnique({
          where: { anilistId: id },
          include: {
            mediaCharacters: {
              include: {
                actor: true,
              },
            },
          },
        });
      }

      if (!char) return null;

      const animeAppearances: CharacterMediaAppearance[] = [];
      const mangaAppearances: CharacterMediaAppearance[] = [];
      const movieAppearances: CharacterMediaAppearance[] = [];
      const tvAppearances: CharacterMediaAppearance[] = [];
      const gameAppearances: CharacterMediaAppearance[] = [];
      const bookAppearances: CharacterMediaAppearance[] = [];

      for (const mc of char.mediaCharacters) {
        const actorObj = mc.actor
          ? {
              id: mc.actor.id,
              namePrimary: mc.actor.namePrimary,
              nameNative: mc.actor.nameNative,
              image: mc.actor.image,
            }
          : null;

        if (mc.mediaType === MediaType.ANIME) {
          const anime = await this.prisma.client.aquilaAnimeV2.findUnique({
            where: { id: mc.mediaId },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true, format: true, status: true },
          });
          if (anime) {
            animeAppearances.push({
              id: anime.id,
              title: anime.titlePrimary,
              secondaryTitle: anime.titleSecondary,
              coverImage: anime.coverImage,
              format: anime.format,
              status: anime.status,
              role: mc.role,
              actor: actorObj,
            });
          }
        } else if (mc.mediaType === MediaType.MANGA) {
          const manga = await this.prisma.client.aquilaMangaV2.findUnique({
            where: { id: mc.mediaId },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true, format: true, status: true },
          });
          if (manga) {
            mangaAppearances.push({
              id: manga.id,
              title: manga.titlePrimary,
              secondaryTitle: manga.titleSecondary,
              coverImage: manga.coverImage,
              format: manga.format,
              status: manga.status,
              role: mc.role,
              actor: actorObj,
            });
          }
        } else if (mc.mediaType === MediaType.MOVIE) {
          const movie = await this.prisma.client.aquilaMovieV2.findUnique({
            where: { id: mc.mediaId },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true, status: true },
          });
          if (movie) {
            movieAppearances.push({
              id: movie.id,
              title: movie.titlePrimary,
              secondaryTitle: movie.titleSecondary,
              coverImage: movie.coverImage,
              format: 'MOVIE',
              status: movie.status || 'RELEASED',
              role: mc.role,
              actor: actorObj,
            });
          }
        } else if (mc.mediaType === MediaType.TV) {
          const tv = await this.prisma.client.aquilaTvV2.findUnique({
            where: { id: mc.mediaId },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true, status: true },
          });
          if (tv) {
            tvAppearances.push({
              id: tv.id,
              title: tv.titlePrimary,
              secondaryTitle: tv.titleSecondary,
              coverImage: tv.coverImage,
              format: 'TV',
              status: tv.status || 'RELEASED',
              role: mc.role,
              actor: actorObj,
            });
          }
        } else if (mc.mediaType === MediaType.GAME) {
          const game = await this.prisma.client.aquilaGameV2.findUnique({
            where: { id: mc.mediaId },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true, status: true },
          });
          if (game) {
            gameAppearances.push({
              id: game.id,
              title: game.titlePrimary,
              secondaryTitle: game.titleSecondary,
              coverImage: game.coverImage,
              format: 'GAME',
              status: game.status || 'RELEASED',
              role: mc.role,
              actor: actorObj,
            });
          }
        } else if (mc.mediaType === MediaType.BOOK) {
          const book = await this.prisma.client.aquilaBookV2.findUnique({
            where: { id: mc.mediaId },
            select: { id: true, titlePrimary: true, titleSecondary: true, coverImage: true, status: true },
          });
          if (book) {
            bookAppearances.push({
              id: book.id,
              title: book.titlePrimary,
              secondaryTitle: book.titleSecondary,
              coverImage: book.coverImage,
              format: 'BOOK',
              status: book.status || 'RELEASED',
              role: mc.role,
              actor: actorObj,
            });
          }
        }
      }

      return {
        id: char.id,
        anilistId: char.anilistId,
        malId: char.malId,
        tvDBId: char.tvDBId,
        bangumiId: char.bangumiId,
        namePrimary: char.namePrimary,
        nameNative: char.nameNative,
        nameAlternative: char.nameAlternative,
        nameAlternativeSpoiler: char.nameAlternativeSpoiler,
        image: char.image,
        images: char.images,
        description: char.description,
        gender: char.gender,
        age: char.age,
        bloodType: char.bloodType,
        dateOfBirthYear: char.dateOfBirthYear,
        dateOfBirthMonth: char.dateOfBirthMonth,
        dateOfBirthDay: char.dateOfBirthDay,
        favorites: char.favorites,
        animeAppearances,
        mangaAppearances,
        movieAppearances,
        tvAppearances,
        gameAppearances,
        bookAppearances,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch V2 character ${id} from database: ${err.message}`);
      throw new rrError(`${this.moduleCode}FTFC001`, {
        message: 'Failed to fetch character details from database',
      });
    }
  }

  public async search(query: string): Promise<CharacterSearchEntity[]> {
    this.logger.debug(`Searching V2 characters for query: ${query}`);
    try {
      const trimmed = query.trim();
      if (!trimmed) return [];

      const data = await this.prisma.client.aquilaCharacterV2.findMany({
        where: {
          OR: [
            { namePrimary: { contains: trimmed, mode: 'insensitive' } },
            { nameNative: { contains: trimmed, mode: 'insensitive' } },
            { nameAlternative: { hasSome: [trimmed] } },
          ],
        },
        take: 30,
      });

      return data.map((item) => ({
        id: item.id,
        anilistId: item.anilistId,
        title: item.namePrimary,
        secondaryTitle: item.nameNative || null,
        coverImage: item.image || null,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to search V2 characters: ${err.message}`);
      throw new rrError(`${this.moduleCode}SRCH001`, {
        message: 'Failed to search characters in database',
      });
    }
  }
}
