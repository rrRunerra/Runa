import { IsOptional, IsString, IsInt, Min, IsNotEmpty, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';

export class DiscoverQueryDto {
  @IsOptional()
  page?: string | number;

  @IsOptional()
  limit?: string | number;

  @IsOptional()
  year?: string | number;

  @IsOptional()
  @IsString({ message: 'DqDto-FMBAS001: Format must be a string' })
  format?: string;

  @IsOptional()
  @IsString({ message: 'DqDto-SMBAS001: Status must be a string' })
  status?: string;

  @IsOptional()
  @IsString({ message: 'DqDto-GMBAS001: Genres must be a string' })
  genres?: string;

  @IsOptional()
  @IsString({ message: 'DqDto-CMBAS001: Country must be a string' })
  countryOfOrigin?: string;

  @IsOptional()
  @IsString({ message: 'DqDto-AMBAS001: isAdult must be a string' })
  isAdult?: string;

  @IsOptional()
  @IsString({ message: 'DqDto-STMBAS001: Studio must be a string' })
  studio?: string;

  @IsOptional()
  minEpisodes?: string | number;

  @IsOptional()
  maxEpisodes?: string | number;

  @IsOptional()
  minSeasons?: string | number;

  @IsOptional()
  maxSeasons?: string | number;

  @IsOptional()
  @IsString({ message: 'DqDto-SMBAS002: Search must be a string' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'DqDto-SMBAS003: Sort must be a string' })
  sort?: string;

  @IsOptional()
  @IsString({ message: 'DqDto-SMBAS004: AddedWithin must be a string' })
  addedWithin?: string;
}

export class CalendarQueryDto {
  @IsNotEmpty({ message: 'CalDto-STRQ001: Start date is required' })
  @IsString({ message: 'CalDto-STSTR001: Start date must be a string' })
  start: string;

  @IsNotEmpty({ message: 'CalDto-ENDRQ001: End date is required' })
  @IsString({ message: 'CalDto-ENDSTR001: End date must be a string' })
  end: string;

  @IsOptional()
  @IsString({ message: 'CalDto-WLTSTR001: Watchlist filter must be a string representation of boolean' })
  watchlist?: string;
}

