export default class ListEntity {
  id: number | string;
  title: string;
  score?: number | null;
  progress?: number | null;
  episodes?: number | null;
  image: string;
  format: string;
  status: string;
  last_updated: Date;
  last_added: Date;
  type: 'anime' | 'manga' | 'tv' | 'movie' | 'game' | 'book';
  meta?: {
    season: number;
    episode: number;
  };
}
