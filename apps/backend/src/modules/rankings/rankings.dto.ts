import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class RankingsQueryDto {
  @IsOptional()
  @IsString({ message: 'RaDto-SMBAS001: Source must be a string' })
  source?: string;

  @IsOptional()
  @IsString({ message: 'RaDto-GMBAS001: Genres must be a string' })
  genres?: string;

  @IsOptional()
  year?: string | number;

  @IsOptional()
  @IsString({ message: 'RaDto-SMBAS002: Season must be a string' })
  season?: string;

  @IsOptional()
  @IsString({ message: 'RaDto-FMBAS001: Format must be a string' })
  format?: string;

  @IsOptional()
  @IsString({ message: 'RaDto-SMBAS003: Status must be a string' })
  status?: string;

  @IsOptional()
  limit?: string | number;

  @IsOptional()
  page?: string | number;
}

export class RankingsParamDto {
  @IsNotEmpty({ message: 'RaDto-TMBAS001: Media type is required' })
  @IsString({ message: 'RaDto-TMBAS002: Media type must be a string' })
  type: string;
}
