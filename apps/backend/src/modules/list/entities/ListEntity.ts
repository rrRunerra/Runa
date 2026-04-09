import { $Enums } from '@runa/database';

export default class ListEntity {
  id: number;
  title: string;
  score?: number | null;
  progress?: number | null;
  image: string;
  format: $Enums.AnimeFormat;
  status: $Enums.AnimeListStatus;
  last_updated: Date;
  last_added: Date;
}
