import { IsString, IsNotEmpty, IsInt, Min, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchGameDto {
  @IsString({ message: 'ShGaDto-NMBAS001: Name must be a string' })
  @IsNotEmpty({ message: 'ShGaDto-NMNBE001: Name must not be empty' })
  name: string;
}

export class GameDetailDto {
  @Type(() => Number)
  @IsDefined({ message: 'GaDlDto-ICBE001: Id cannot be empty' })
  @IsInt({ message: 'GaDlDto-IMBAN001: Id must be a number' })
  @Min(1, { message: 'GaDlDto-ICBLTO001: Id cannot be less than one' })
  id: number;
}

export class GameRefreshDto {
  @Type(() => Number)
  @IsDefined({ message: 'GaRhDto-ICBE001: Id cannot be empty' })
  @IsInt({ message: 'GaRhDto-IMBAN001: Id must be a number' })
  @Min(1, { message: 'GaRhDto-ICBLTO001: Id cannot be less than one' })
  id: number;
}
