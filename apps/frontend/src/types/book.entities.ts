export interface BookSearchEntity {
  id: number;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
}

export interface BookEntity {
  id: number;
  googleBookId: string;
  titleString: string | null;
  subtitle: string | null;
  coverImage: string | null;
  description: string | null;
  publishedYear: number | null;
  publishedMonth: number | null;
  publishedDay: number | null;
  publishedDate: string | null;
  subjects: string[];
  authors: string[];
  artists: string[];
  publishers: string[];
  pages: number | null;
  chapters: number | null;
  averageRating: number | null;
  ratingsCount: number | null;
  language: string | null;
  isbn10: string | null;
  isbn13: string | null;
  previewLink: string | null;
  infoLink: string | null;
  buyLink: string | null;
  retailPrice: number | null;
  retailPriceCurrency: string | null;
  maturityRating: string | null;
  publisher: string | null;
  locked: boolean;
  updatedAt: Date;

  localPopularity: number;
  localFavoritesCount: number;
  localAverageScore: number;
  localStatusDistribution: Record<string, number>;
  localScoreDistribution: Record<string, number>;
}
