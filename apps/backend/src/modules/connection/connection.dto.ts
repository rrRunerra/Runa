import { ConnectionLinkedTo } from '@runa/database';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
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

  @IsBoolean()
  @IsOptional()
  private?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class RemoveConnectionDto {
  @IsString()
  @IsOptional()
  username?: string;
}
