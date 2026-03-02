import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export enum ConnectionProvider {
  ANILIST = 'ANILIST',
  THETVDB = 'THETVDB',
  MAL = 'MAL',
}

export class UpsertConnectionDto {
  @IsEnum(ConnectionProvider)
  @IsNotEmpty()
  provider!: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  connectionId?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
