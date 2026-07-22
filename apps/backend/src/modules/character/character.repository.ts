import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { CharacterDetailEntity, CharacterMediaAppearance } from './character.entities';
import { rrError } from 'src/providers/error';
import { Prisma } from '@runa/database';

@Injectable()
export class CharacterRepository {
  private readonly moduleCode = 'ChRpstry-';
  private readonly logger = new Logger(CharacterRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async find(id: number): Promise<CharacterDetailEntity | null> {
    this.logger.debug(`Fetching character details for ID: ${id}`);
    try {
      const char = await this.prisma.client.aquilaCharacter.findUnique({
        where: { id },
        include: {
          animeCharacters: {
            include: {
              anime: true,
              voiceActor: true,
            },
          },
          mangaCharacters: {
            include: {
              manga: true,
            },
          },
          movieCharacters: {
            include: {
              movie: true,
              actor: true,
            },
          },
          tvCharacters: {
            include: {
              tv: true,
              actor: true,
            },
          },
        },
      });

      if (!char) return null;

      const animeAppearances: CharacterMediaAppearance[] = char.animeCharacters.map((ac) => ({
        id: ac.anime.id,
        title: ac.anime.titleEnglish || ac.anime.titleRomaji || 'Unknown Anime',
        coverImage: ac.anime.coverImageLarge,
        format: ac.anime.format,
        status: ac.anime.status,
        role: ac.role,
        actor: ac.voiceActor ? {
          id: ac.voiceActor.id,
          peopleId: ac.voiceActor.peopleId,
          anilistStaffId: ac.voiceActor.anilistStaffId,
          name: ac.voiceActor.name,
          personName: ac.voiceActor.personName,
          image: ac.voiceActor.image,
          peopleType: ac.voiceActor.peopleType,
        } : null,
      }));

      const mangaAppearances: CharacterMediaAppearance[] = char.mangaCharacters.map((mc) => ({
        id: mc.manga.id,
        title: mc.manga.titleEnglish || mc.manga.titleRomaji || 'Unknown Manga',
        coverImage: mc.manga.coverImageLarge,
        format: mc.manga.format,
        status: mc.manga.status,
        role: mc.role,
      }));

      const movieAppearances: CharacterMediaAppearance[] = char.movieCharacters.map((mc) => ({
        id: mc.movie.id,
        title: mc.movie.titleEnglish || mc.movie.titleRomaji || 'Unknown Movie',
        coverImage: mc.movie.coverImage,
        format: 'MOVIE',
        status: mc.movie.status || 'RELEASED',
        role: mc.role,
        actor: mc.actor ? {
          id: mc.actor.id,
          peopleId: mc.actor.peopleId,
          anilistStaffId: mc.actor.anilistStaffId,
          name: mc.actor.name,
          personName: mc.actor.personName,
          image: mc.actor.image,
          peopleType: mc.actor.peopleType,
        } : null,
      }));

      const tvAppearances: CharacterMediaAppearance[] = char.tvCharacters.map((tc) => ({
        id: tc.tv.id,
        title: tc.tv.titleEnglish || tc.tv.titleRomaji || 'Unknown TV Show',
        coverImage: tc.tv.coverImage,
        format: 'TV',
        status: tc.tv.status || 'RELEASED',
        role: tc.role,
        actor: tc.actor ? {
          id: tc.actor.id,
          peopleId: tc.actor.peopleId,
          anilistStaffId: tc.actor.anilistStaffId,
          name: tc.actor.name,
          personName: tc.actor.personName,
          image: tc.actor.image,
          peopleType: tc.actor.peopleType,
        } : null,
      }));

      return {
        id: char.id,
        anilistId: char.anilistId,
        nameFirst: char.nameFirst,
        nameMiddle: char.nameMiddle,
        nameLast: char.nameLast,
        nameNative: char.nameNative,
        nameAlternative: char.nameAlternative,
        nameAlternativeSpoiler: char.nameAlternativeSpoiler,
        image: char.image,
        description: char.description,
        gender: char.gender,
        age: char.age,
        bloodType: char.bloodType,
        dateOfBirthYear: char.dateOfBirthYear,
        dateOfBirthMonth: char.dateOfBirthMonth,
        dateOfBirthDay: char.dateOfBirthDay,
        animeAppearances,
        mangaAppearances,
        movieAppearances,
        tvAppearances,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch character ${id} from database: ${err.message}`);
      throw new rrError(`${this.moduleCode}FTFC001`, {
        message: 'Failed to fetch character details from database',
      });
    }
  }

  public async search(query: string): Promise<any[]> {
    this.logger.debug(`Searching characters for query: ${query}`);
    try {
      const trimmed = query.trim();
      if (!trimmed) return [];

      const words = trimmed.split(/\s+/).filter(Boolean);

      const whereConditions: Prisma.AquilaCharacterWhereInput[] = [
        { nameFirst: { contains: trimmed, mode: 'insensitive' } },
        { nameMiddle: { contains: trimmed, mode: 'insensitive' } },
        { nameLast: { contains: trimmed, mode: 'insensitive' } },
        { nameNative: { contains: trimmed, mode: 'insensitive' } },
        { nameAlternative: { hasSome: [trimmed] } },
      ];

      if (words.length > 1) {
        whereConditions.push({
          AND: words.map((word) => ({
            OR: [
              { nameFirst: { contains: word, mode: 'insensitive' } },
              { nameMiddle: { contains: word, mode: 'insensitive' } },
              { nameLast: { contains: word, mode: 'insensitive' } },
              { nameNative: { contains: word, mode: 'insensitive' } },
              { nameAlternative: { hasSome: [word] } },
            ],
          })),
        });
      }

      const data = await this.prisma.client.aquilaCharacter.findMany({
        where: {
          OR: whereConditions,
        },
        take: 30,
      });

      return data.map((item) => ({
        id: item.id,
        title: [item.nameFirst, item.nameMiddle, item.nameLast].filter(Boolean).join(' ') || item.nameNative || 'Unknown Character',
        secondaryTitle: item.nameNative || null,
        coverImage: item.image || null,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to search characters: ${err.message}`);
      throw new rrError(`${this.moduleCode}SRCH001`, {
        message: 'Failed to search characters in database',
      });
    }
  }
}
