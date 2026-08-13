export interface AnimeUpdateData {
  status?: string;
  progress?: number;
  score?: number;
  startDate?: number | null;
  endDate?: number | null;
  notes?: string;
  rewatched?: number;
}

export interface MangaUpdateData {
  status?: string;
  chapters?: number;
  volumes?: number;
  score?: number;
  startDate?: number | null;
  endDate?: number | null;
  notes?: string;
  reread?: number;
}

export interface MovieUpdateData {
  status?: string;
  score?: number;
  startDate?: number | null;
  endDate?: number | null;
  notes?: string;
  rewatched?: number;
}

export interface TvUpdateData {
  status?: string;
  score?: number;
  startDate?: number | null;
  endDate?: number | null;
  notes?: string;
  rewatched?: number;
  watchedEpisodes?: { seasonNum: number; episodeNum: number }[];
}

export interface ConnectionDependencies {
  prisma: any;
  apiUrl: string;
  env: Record<string, string | undefined>;
}
