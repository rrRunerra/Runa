import { AnimeFormat, AnimeStatus, MangaFormat, MangaStatus } from '@runa/database';
import { ActorEntity } from '../anime/anime.entities';

export interface CharacterMediaAppearance {
  id: number;
  title: string;
  coverImage: string | null;
  format: string;
  status: string;
  role: string | null;
  actor?: ActorEntity | null;
}

export interface CharacterDetailEntity {
  id: number;
  anilistId: number | null;
  nameFirst: string | null;
  nameMiddle: string | null;
  nameLast: string | null;
  nameNative: string | null;
  nameAlternative: string[];
  nameAlternativeSpoiler: string[];
  image: string | null;
  description: string | null;
  gender: string | null;
  age: string | null;
  bloodType: string | null;
  dateOfBirthYear: number | null;
  dateOfBirthMonth: number | null;
  dateOfBirthDay: number | null;

  animeAppearances: CharacterMediaAppearance[];
  mangaAppearances: CharacterMediaAppearance[];
  movieAppearances: CharacterMediaAppearance[];
  tvAppearances: CharacterMediaAppearance[];
}
