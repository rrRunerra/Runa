// ---------------------------------------------------------------------------
// Score Stats (shared base)
// ---------------------------------------------------------------------------

export interface ScoreStatsEntity {
  meanScore: number;
  standardDeviation: number;
  scoreDistribution: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Anime Stats
// ---------------------------------------------------------------------------

export interface AnimeStatsEntity extends ScoreStatsEntity {
  count: number;
  episodesWatched: number;
  daysWatched: number;
  hoursPlanned: number;
  episodeCountDistribution: Record<string, number>;
  formatDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  countryDistribution: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Manga Stats
// ---------------------------------------------------------------------------

export interface MangaStatsEntity extends ScoreStatsEntity {
  count: number;
  chaptersRead: number;
  volumesRead: number;
  chaptersPlanned: number;
  chapterCountDistribution: Record<string, number>;
  formatDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  countryDistribution: Record<string, number>;
}

// ---------------------------------------------------------------------------
// TV Stats
// ---------------------------------------------------------------------------

export interface TvStatsEntity extends ScoreStatsEntity {
  count: number;
  episodesWatched: number;
  hoursWatched: number;
  statusDistribution: Record<string, number>;
  countryDistribution: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Movie Stats
// ---------------------------------------------------------------------------

export interface MovieStatsEntity extends ScoreStatsEntity {
  count: number;
  hoursWatched: number;
  hoursPlanned: number;
  statusDistribution: Record<string, number>;
  countryDistribution: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Game Stats
// ---------------------------------------------------------------------------

export interface GameStatsEntity extends ScoreStatsEntity {
  count: number;
  hoursPlayed: number;
  statusDistribution: Record<string, number>;
  platformDistribution: Record<string, number>;
  genreDistribution: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Book Stats
// ---------------------------------------------------------------------------

export interface BookStatsEntity extends ScoreStatsEntity {
  count: number;
  chaptersRead: number;
  volumesRead: number;
  pagesRead: number;
  statusDistribution: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Union type for any stats response
// ---------------------------------------------------------------------------

export type StatsEntity =
  | AnimeStatsEntity
  | MangaStatsEntity
  | TvStatsEntity
  | MovieStatsEntity
  | GameStatsEntity
  | BookStatsEntity;

// ---------------------------------------------------------------------------
// Default empty stats (returned when no record exists)
// ---------------------------------------------------------------------------

export const DEFAULT_ANIME_STATS: AnimeStatsEntity = {
  count: 0,
  meanScore: 0,
  standardDeviation: 0,
  scoreDistribution: {},
  episodesWatched: 0,
  daysWatched: 0,
  hoursPlanned: 0,
  episodeCountDistribution: {},
  formatDistribution: {},
  statusDistribution: {},
  countryDistribution: {},
};

export const DEFAULT_MANGA_STATS: MangaStatsEntity = {
  count: 0,
  meanScore: 0,
  standardDeviation: 0,
  scoreDistribution: {},
  chaptersRead: 0,
  volumesRead: 0,
  chaptersPlanned: 0,
  chapterCountDistribution: {},
  formatDistribution: {},
  statusDistribution: {},
  countryDistribution: {},
};

export const DEFAULT_TV_STATS: TvStatsEntity = {
  count: 0,
  meanScore: 0,
  standardDeviation: 0,
  scoreDistribution: {},
  episodesWatched: 0,
  hoursWatched: 0,
  statusDistribution: {},
  countryDistribution: {},
};

export const DEFAULT_MOVIE_STATS: MovieStatsEntity = {
  count: 0,
  meanScore: 0,
  standardDeviation: 0,
  scoreDistribution: {},
  hoursWatched: 0,
  hoursPlanned: 0,
  statusDistribution: {},
  countryDistribution: {},
};

export const DEFAULT_GAME_STATS: GameStatsEntity = {
  count: 0,
  meanScore: 0,
  standardDeviation: 0,
  scoreDistribution: {},
  hoursPlayed: 0,
  statusDistribution: {},
  platformDistribution: {},
  genreDistribution: {},
};

export const DEFAULT_BOOK_STATS: BookStatsEntity = {
  count: 0,
  meanScore: 0,
  standardDeviation: 0,
  scoreDistribution: {},
  chaptersRead: 0,
  volumesRead: 0,
  pagesRead: 0,
  statusDistribution: {},
};
