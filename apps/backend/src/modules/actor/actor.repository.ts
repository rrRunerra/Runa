import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { ActorDetailEntity, ActorRoleAppearance } from './actor.entities';
import { rrError } from 'src/providers/error';

@Injectable()
export class ActorRepository {
  private readonly moduleCode = 'AcRpstry-';
  private readonly logger = new Logger(ActorRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  public async find(id: number): Promise<ActorDetailEntity | null> {
    this.logger.debug(`Fetching actor details for ID: ${id}`);
    try {
      const actor = await this.prisma.client.aquilaActor.findUnique({
        where: { id },
        include: {
          animeCharacters: {
            include: {
              anime: true,
              character: true,
            },
          },
          movieCharacters: {
            include: {
              movie: true,
              character: true,
            },
          },
          tvCharacters: {
            include: {
              tv: true,
              character: true,
            },
          },
        },
      });

      if (!actor) return null;

      const animeRoles: ActorRoleAppearance[] = actor.animeCharacters.map((ac) => ({
        id: ac.anime.id,
        title: ac.anime.titleEnglish || ac.anime.titleRomaji || 'Unknown Anime',
        coverImage: ac.anime.coverImageLarge,
        format: ac.anime.format,
        status: ac.anime.status,
        role: ac.role,
        character: {
          id: ac.character.id,
          anilistId: ac.character.anilistId,
          nameFirst: ac.character.nameFirst,
          nameMiddle: ac.character.nameMiddle,
          nameLast: ac.character.nameLast,
          nameNative: ac.character.nameNative,
          nameAlternative: ac.character.nameAlternative,
          nameAlternativeSpoiler: ac.character.nameAlternativeSpoiler,
          image: ac.character.image,
          description: ac.character.description,
          gender: ac.character.gender,
          age: ac.character.age,
          bloodType: ac.character.bloodType,
          dateOfBirthYear: ac.character.dateOfBirthYear,
          dateOfBirthMonth: ac.character.dateOfBirthMonth,
          dateOfBirthDay: ac.character.dateOfBirthDay,
        },
      }));

      const movieRoles: ActorRoleAppearance[] = actor.movieCharacters.map((mc) => ({
        id: mc.movie.id,
        title: mc.movie.titleEnglish || mc.movie.titleRomaji || 'Unknown Movie',
        coverImage: mc.movie.coverImage,
        format: 'MOVIE',
        status: mc.movie.status || 'RELEASED',
        role: mc.role,
        character: {
          id: mc.character.id,
          anilistId: mc.character.anilistId,
          nameFirst: mc.character.nameFirst,
          nameMiddle: mc.character.nameMiddle,
          nameLast: mc.character.nameLast,
          nameNative: mc.character.nameNative,
          nameAlternative: mc.character.nameAlternative,
          nameAlternativeSpoiler: mc.character.nameAlternativeSpoiler,
          image: mc.character.image,
          description: mc.character.description,
          gender: mc.character.gender,
          age: mc.character.age,
          bloodType: mc.character.bloodType,
          dateOfBirthYear: mc.character.dateOfBirthYear,
          dateOfBirthMonth: mc.character.dateOfBirthMonth,
          dateOfBirthDay: mc.character.dateOfBirthDay,
        },
      }));

      const tvRoles: ActorRoleAppearance[] = actor.tvCharacters.map((tc) => ({
        id: tc.tv.id,
        title: tc.tv.titleEnglish || tc.tv.titleRomaji || 'Unknown TV Show',
        coverImage: tc.tv.coverImage,
        format: 'TV',
        status: tc.tv.status || 'RELEASED',
        role: tc.role,
        character: {
          id: tc.character.id,
          anilistId: tc.character.anilistId,
          nameFirst: tc.character.nameFirst,
          nameMiddle: tc.character.nameMiddle,
          nameLast: tc.character.nameLast,
          nameNative: tc.character.nameNative,
          nameAlternative: tc.character.nameAlternative,
          nameAlternativeSpoiler: tc.character.nameAlternativeSpoiler,
          image: tc.character.image,
          description: tc.character.description,
          gender: tc.character.gender,
          age: tc.character.age,
          bloodType: tc.character.bloodType,
          dateOfBirthYear: tc.character.dateOfBirthYear,
          dateOfBirthMonth: tc.character.dateOfBirthMonth,
          dateOfBirthDay: tc.character.dateOfBirthDay,
        },
      }));

      return {
        id: actor.id,
        peopleId: actor.peopleId,
        anilistStaffId: actor.anilistStaffId,
        name: actor.name,
        personName: actor.personName,
        image: actor.image,
        peopleType: actor.peopleType,
        animeRoles,
        movieRoles,
        tvRoles,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch actor ${id} from database: ${err.message}`);
      throw new rrError(`${this.moduleCode}FTFA001`, {
        message: 'Failed to fetch actor details from database',
      });
    }
  }

  public async search(query: string): Promise<any[]> {
    this.logger.debug(`Searching actors for query: ${query}`);
    try {
      const data = await this.prisma.client.aquilaActor.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { personName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 30,
      });

      return data.map((item) => ({
        id: item.id,
        title: item.name || item.personName || 'Unknown Actor',
        secondaryTitle: item.personName || null,
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
