import { ConnectionLinkedTo } from '@runa/database';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export enum ConnectionProvider {
  ANILIST = 'ANILIST',
  MAL = 'MAL',
  SIMKL = 'SIMKL',
}

export class UpsertConnectionDto {
  @IsEnum(ConnectionProvider)
  @IsNotEmpty()
  provider!: string;

  @IsString()
  @IsOptional()
  linkedUsername?: string;

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
  username?: string;

  @IsEnum(ConnectionLinkedTo)
  @IsOptional()
  linkedTo?: ConnectionLinkedTo;
}
