import { IsString, IsNotEmpty, IsInt, Min, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchTvDto {
  @IsString({ message: 'ShTvDto-NMBAS001: Name must be a string' })
  @IsNotEmpty({ message: 'ShTvDto-NMNBE001: Name must not be empty' })
  name: string;
}

export class TvDetailDto {
  @Type(() => Number)
  @IsDefined({ message: 'TvDlDto-ICBE001: Id cannot be empty' })
  @IsInt({ message: 'TvDlDto-IMBAN001: Id must be a number' })
  @Min(1, { message: 'TvDlDto-ICBLTO001: Id cannot be less than one' })
  id: number;
}

export class TvRefreshDto {
  @Type(() => Number)
  @IsDefined({ message: 'TvRhDto-ICBE001: Id cannot be empty' })
  @IsInt({ message: 'TvRhDto-IMBAN001: Id must be a number' })
  @Min(1, { message: 'TvRhDto-ICBLTO001: Id cannot be less than one' })
  id: number;
}
