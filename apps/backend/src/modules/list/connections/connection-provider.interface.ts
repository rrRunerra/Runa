export interface AnimeUpdateData {
  status?: string;
  progress?: number;
  score?: number;
  startDate?: number;
  endDate?: number;
  notes?: string;
  rewatched?: number;
}

export interface MangaUpdateData {
  status?: string;
  chapters?: number;
  volumes?: number;
  score?: number;
  startDate?: number;
  endDate?: number;
  notes?: string;
  reread?: number;
}

export interface IConnectionProvider {
  providerKey: string;
  updateAnimeEntry(username: string, providerId: number, data: AnimeUpdateData): Promise<void>;
  updateMangaEntry(username: string, providerId: number, data: MangaUpdateData): Promise<void>;
}
