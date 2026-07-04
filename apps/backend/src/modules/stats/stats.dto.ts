import {
  IsNotEmpty,
  IsString,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class GetStatsDto {
  @IsString({ message: 'GtStdto-UMBAS001: Username must be a string' })
  @IsNotEmpty({ message: 'GtStdto-UMNBE001: Username must not be empty' })
  @MinLength(3, { message: 'GtStdto-UMBALTC001: Username must be at least 3 characters long' })
  @MaxLength(32, { message: 'GtStdto-UMBALTC002: Username must be at most 32 characters long' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'GtStdto-UMMOCLLNAU001: Username must contain only lowercase letters, numbers, and underscores',
  })
  username!: string;

  @IsString({ message: 'GtStdto-TMBAS001: Type must be a string' })
  @IsNotEmpty({ message: 'GtStdto-TMNBE001: Type must not be empty' })
  @IsIn(['anime', 'manga', 'tv', 'movie', 'game', 'book'], {
    message: 'GtStdto-TMBOTO001: Type must be one of anime, manga, tv, movie, game, book',
  })
  type!: string;
}

export class GetAllStatsDto {
  @IsString({ message: 'GtAlStdto-UMBAS001: Username must be a string' })
  @IsNotEmpty({ message: 'GtAlStdto-UMNBE001: Username must not be empty' })
  @MinLength(3, { message: 'GtAlStdto-UMBALTC001: Username must be at least 3 characters long' })
  @MaxLength(32, { message: 'GtAlStdto-UMBALTC002: Username must be at most 32 characters long' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'GtAlStdto-UMMOCLLNAU001: Username must contain only lowercase letters, numbers, and underscores',
  })
  username!: string;
}
