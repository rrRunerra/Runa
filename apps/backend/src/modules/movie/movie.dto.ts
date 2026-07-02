import { IsString, IsNotEmpty, IsInt, Min, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchMovieDto {
  @IsString({ message: 'ShMeDto-NMBAS001: Name must be a string' })
  @IsNotEmpty({ message: 'ShMeDto-NMNBE001: Name must not be empty' })
  name: string;
}

export class MovieDetailDto {
  @Type(() => Number)
  @IsDefined({ message: 'MeDlDto-ICBE001: Id cannot be empty' })
  @IsInt({ message: 'MeDlDto-IMBAN001: Id must be a number' })
  @Min(1, { message: 'MeDlDto-ICBLTO001: Id cannot be less than one' })
  id: number;
}

export class MovieRefreshDto {
  @Type(() => Number)
  @IsDefined({ message: 'MeRhDto-ICBE001: Id cannot be empty' })
  @IsInt({ message: 'MeRhDto-IMBAN001: Id must be a number' })
  @Min(1, { message: 'MeRhDto-ICBLTO001: Id cannot be less than one' })
  id: number;
}
