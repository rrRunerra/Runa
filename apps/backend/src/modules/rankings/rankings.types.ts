export type RankingMediaType =
  | 'anime'
  | 'manga'
  | 'movie'
  | 'tv'
  | 'game'
  | 'book';

export type RankingSourceId =
  | 'aquila'
  | 'anilist'
  | 'mal'
  | 'imdb'
  | 'rottenTomatoes'
  | 'metacritic'
  | 'igdb'
  | 'rawg'
  | 'googleBooks';

export interface RankingSourceOption {
  id: RankingSourceId;
  name: string;
  maxScore: number;
}
