export interface ActorEntity {
  id: number;
  peopleId?: number | null;
  anilistId?: number | null;
  malId?: number | null;
  tvDBId?: number | null;
  namePrimary: string;
  nameNative?: string | null;
  nameAlternative?: string[];
  image: string | null;
  role?: string | null;
}

export interface ActorRoleAppearanceV2 {
  id: number;
  mediaType: 'ANIME' | 'MANGA' | 'MOVIE' | 'TV' | 'BOOK' | 'GAME';
  mediaId: number;
  titlePrimary: string;
  coverImage: string | null;
  role: string | null;
  customRole: string | null;
  characterName: string | null;
  characterImage: string | null;
}

export interface ActorDetailEntity {
  id: number;
  anilistId: number | null;
  malId: number | null;
  tvDBId: number | null;
  namePrimary: string;
  nameNative: string | null;
  nameAlternative: string[];
  image: string | null;
  images: any | null;
  description: string | null;
  language: string | null;

  roles: ActorRoleAppearanceV2[];
}
