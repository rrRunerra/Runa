import { IsBoolean, IsOptional } from 'class-validator';

export class PrivacySettingsDto {
  @IsBoolean()
  @IsOptional()
  profile?: boolean;

  @IsBoolean()
  @IsOptional()
  animeList?: boolean;

  @IsBoolean()
  @IsOptional()
  mangaList?: boolean;

  @IsBoolean()
  @IsOptional()
  tvList?: boolean;

  @IsBoolean()
  @IsOptional()
  movieList?: boolean;

  @IsBoolean()
  @IsOptional()
  connections?: boolean;
}
