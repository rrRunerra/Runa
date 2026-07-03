import {
  IsNotEmpty,
  IsString,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class GetStatsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(32, { message: 'Username must be at most 32 characters long' })
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Username must contain only lowercase letters, numbers, and underscores',
  })
  username!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['anime', 'manga', 'tv', 'movie', 'game', 'book'], {
    message: 'Media type must be one of: anime, manga, tv, movie, game, book',
  })
  type!: string;
}

export class GetAllStatsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(32, { message: 'Username must be at most 32 characters long' })
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Username must contain only lowercase letters, numbers, and underscores',
  })
  username!: string;
}
