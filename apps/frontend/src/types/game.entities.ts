export interface GameSearchEntity {
  id: number;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
}

export interface GameEntity {
  id: number;
  rawgId: number;
  titleString: string | null;
  titleNative: string | null;
  slug: string | null;
  coverImage: string | null;
  backgroundImage: string | null;
  description: string | null;
  releasedYear: number | null;
  releasedMonth: number | null;
  releasedDay: number | null;
  released: string | null;
  genres: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
  tags: Record<string, unknown> | null;
  averageScore: number | null;
  popularity: number | null;
  metacritic: number | null;
  rating: number | null;
  ratingsCount: number | null;
  esrbRating: string | null;
  locked: boolean;
  updatedAt: Date;

  localPopularity: number;
  localFavoritesCount: number;
  localAverageScore: number;
  localStatusDistribution: Record<string, number>;
  localScoreDistribution: Record<string, number>;
}
