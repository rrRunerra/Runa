import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { $Enums } from '@runa/database';

export class ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsString()
  genres?: string;

  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsString()
  mediaStatus?: string;
}

export class UsernameParamDto {
  @IsString()
  @IsNotEmpty()
  username: string;
}

export class AnimeIdParamDto {
  @Type(() => Number)
  @IsInt()
  animeId: number;
}

export class MangaIdParamDto {
  @Type(() => Number)
  @IsInt()
  mangaId: number;
}

export class MovieIdParamDto {
  @Type(() => Number)
  @IsInt()
  movieId: number;
}

export class TvIdParamDto {
  @Type(() => Number)
  @IsInt()
  tvId: number;
}

export class GameIdParamDto {
  @Type(() => Number)
  @IsInt()
  gameId: number;
}

export class BookIdParamDto {
  @Type(() => Number)
  @IsInt()
  bookId: number;
}

export class SaveAnimeEntryDto {
  @Type(() => Number)
  @IsInt()
  animeId: number;

  @IsOptional()
  @IsEnum($Enums.AnimeListStatus)
  status?: $Enums.AnimeListStatus;

  @IsOptional()
  @IsInt()
  progress?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  score?: number;

  @IsOptional()
  @IsInt()
  startDate?: number | null;

  @IsOptional()
  @IsInt()
  endDate?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  rewatched?: number;

  @IsOptional()
  @IsBoolean()
  updateConnection?: boolean;

  @IsOptional()
  connections?: {
    anilist?: any;
    mal?: any;
  };
}

export class SaveMangaEntryDto {
  @Type(() => Number)
  @IsInt()
  mangaId: number;

  @IsOptional()
  @IsEnum($Enums.MangaListStatus)
  status?: $Enums.MangaListStatus;

  @IsOptional()
  @IsInt()
  chapters?: number;

  @IsOptional()
  @IsInt()
  volumes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  score?: number;

  @IsOptional()
  @IsInt()
  startDate?: number | null;

  @IsOptional()
  @IsInt()
  endDate?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  reread?: number;

  @IsOptional()
  @IsBoolean()
  updateConnection?: boolean;

  @IsOptional()
  connections?: {
    anilist?: any;
    mal?: any;
  };
}

export class SaveMovieEntryDto {
  @Type(() => Number)
  @IsInt()
  movieId: number;

  @IsOptional()
  @IsEnum($Enums.MovieListStatus)
  status?: $Enums.MovieListStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  score?: number;

  @IsOptional()
  @IsInt()
  startDate?: number | null;

  @IsOptional()
  @IsInt()
  endDate?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  rewatched?: number;

  @IsOptional()
  @IsBoolean()
  updateConnection?: boolean;

  @IsOptional()
  connections?: any;
}

export class SaveTvEntryDto {
  @Type(() => Number)
  @IsInt()
  tvId: number;

  @IsOptional()
  @IsEnum($Enums.TvListStatus)
  status?: $Enums.TvListStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  score?: number;

  @IsOptional()
  @IsInt()
  startDate?: number | null;

  @IsOptional()
  @IsInt()
  endDate?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  rewatched?: number;

  @IsOptional()
  @IsBoolean()
  updateConnection?: boolean;

  @IsOptional()
  connections?: any;

  @IsOptional()
  @IsArray()
  episodes?: { seasonNum: number; episodeNum: number }[];
}

export class SaveGameEntryDto {
  @Type(() => Number)
  @IsInt()
  gameId: number;

  @IsOptional()
  @IsEnum($Enums.GameListStatus)
  status?: $Enums.GameListStatus;

  @IsOptional()
  @IsInt()
  progress?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  score?: number;

  @IsOptional()
  @IsInt()
  startDate?: number | null;

  @IsOptional()
  @IsInt()
  endDate?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  updateConnection?: boolean;

  @IsOptional()
  connections?: any;
}

export class SaveBookEntryDto {
  @Type(() => Number)
  @IsInt()
  bookId: number;

  @IsOptional()
  @IsEnum($Enums.BookListStatus)
  status?: $Enums.BookListStatus;

  @IsOptional()
  @IsInt()
  chapters?: number;

  @IsOptional()
  @IsInt()
  volumes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  score?: number;

  @IsOptional()
  @IsInt()
  startDate?: number | null;

  @IsOptional()
  @IsInt()
  endDate?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  updateConnection?: boolean;

  @IsOptional()
  connections?: any;
}

export class IncrementProgressDto {
  @IsString()
  @IsNotEmpty()
  mediaType: 'anime' | 'manga' | 'tv' | 'movie' | 'game' | 'book';

  @Type(() => Number)
  @IsInt()
  id: number;

  @IsOptional()
  @IsInt()
  count?: number;
}

export class ToggleEpisodeDto {
  @Type(() => Number)
  @IsInt()
  seasonNum: number;

  @Type(() => Number)
  @IsInt()
  episodeNum: number;
}

export class ToggleSeasonDto {
  @Type(() => Number)
  @IsInt()
  seasonNum: number;

  @IsArray()
  episodes: any[];

  @IsBoolean()
  watched: boolean;
}

export class MediaSequelsQueryDto {
  @IsOptional()
  @IsString()
  relationType?: string;

  @IsOptional()
  @IsString()
  releaseStatus?: string;

  @IsOptional()
  @IsString()
  includeInList?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}

export class ExportRrListQueryDto {
  @IsOptional()
  @IsString()
  types?: string;
}

export class ExportMalQueryDto {
  @IsString()
  type: 'anime' | 'manga';
}
