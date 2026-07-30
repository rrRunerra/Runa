export interface CharacterMediaAppearance {
  id: number;
  title: string;
  secondaryTitle?: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  role: string | null;
  actor?: {
    id: number;
    namePrimary: string;
    nameNative?: string | null;
    image?: string | null;
  } | null;
}

export interface CharacterDetailEntity {
  id: number;
  anilistId: number | null;
  malId?: number | null;
  tvDBId?: number | null;
  bangumiId?: number | null;

  namePrimary: string;
  nameNative: string | null;
  nameAlternative: string[];
  nameAlternativeSpoiler: string[];

  image: string | null;
  images?: any;
  description: string | null;
  gender: string | null;
  age: string | null;
  bloodType: string | null;

  dateOfBirthYear: number | null;
  dateOfBirthMonth: number | null;
  dateOfBirthDay: number | null;

  favorites?: number | null;

  animeAppearances: CharacterMediaAppearance[];
  mangaAppearances: CharacterMediaAppearance[];
  movieAppearances: CharacterMediaAppearance[];
  tvAppearances: CharacterMediaAppearance[];
  gameAppearances: CharacterMediaAppearance[];
  bookAppearances: CharacterMediaAppearance[];
}

export interface CharacterSearchEntity {
  id: number;
  anilistId?: number | null;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
}
