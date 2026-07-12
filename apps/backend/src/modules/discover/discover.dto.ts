import { IsOptional, IsString, IsInt, Min } from 'class-validator';
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
  @IsString({ message: 'DqDto-SMBAS002: Search must be a string' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'DqDto-SMBAS003: Sort must be a string' })
  sort?: string;
}
