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
  TRAKT = 'TRAKT',
  DISCORD = 'DISCORD',
}

export class UpsertConnectionDto {
  @IsEnum(ConnectionProvider, { message: 'UtCndto-PMBEOECP001: Provider must be one of enum ConnectionProvider' })
  @IsNotEmpty({ message: 'UtCndto-PMNBE001: Provider must not be empty' })
  provider!: string;

  @IsString({ message: 'UtCndto-LUMBAS001: Linked username must be a string' })
  @IsOptional()
  linkedUsername?: string;

  @IsString({ message: 'UtCndto-ATMBAS001: Access token must be a string' })
  @IsOptional()
  accessToken?: string;

  @IsString({ message: 'UtCndto-RTMBAS001: Refresh token must be a string' })
  @IsOptional()
  refreshToken?: string;

  @IsDateString({}, { message: 'UtCndto-EAMBADS001: Expires at must be a date string' })
  @IsOptional()
  expiresAt?: string;

  @IsString({ message: 'UtCndto-CIMBAS001: Connection id must be a string' })
  @IsOptional()
  connectionId?: string;

  @IsString({ message: 'UtCndto-UMBAS001: Username must be a string' })
  @IsOptional()
  username?: string;

  @IsEnum(ConnectionLinkedTo, { message: 'UtCndto-LTMBEOECL001: Linked to must be one of enum ConnectionLinkedTo' })
  @IsOptional()
  linkedTo?: ConnectionLinkedTo;

  @IsBoolean({ message: 'UtCndto-PMBAB001: Private must be a boolean' })
  @IsOptional()
  private?: boolean;

  @IsObject({ message: 'UtCndto-MMBAO001: Metadata must be an object' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class RemoveConnectionDto {
  @IsString({ message: 'ReCndto-UMBAS001: Username must be a string' })
  @IsOptional()
  username?: string;
}
