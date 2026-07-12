import { CharacterEntity } from '../anime/anime.entities';

export interface ActorRoleAppearance {
  id: number; // media local DB id
  title: string; // media title
  coverImage: string | null; // media cover image
  format: string; // media format (e.g. MOVIE, TV, etc.)
  status: string; // media release status
  role: string | null; // character role description/name
  character: CharacterEntity; // character details
}

export interface ActorDetailEntity {
  id: number;
  peopleId: number | null;
  anilistStaffId: number | null;
  name: string | null;
  personName: string | null;
  image: string | null;
  peopleType: string | null;

  animeRoles: ActorRoleAppearance[];
  movieRoles: ActorRoleAppearance[];
  tvRoles: ActorRoleAppearance[];
}
