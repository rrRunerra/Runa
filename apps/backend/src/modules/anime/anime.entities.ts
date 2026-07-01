import { AnimeFormat, AnimeStatus } from '@runa/database';

export interface AnimeSearchEntity {
  id: number;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: AnimeFormat;
  status: AnimeStatus;
  isAdult: boolean;
  averageScore: number | null;
}

export interface AnimeEntity {}
