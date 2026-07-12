import { IsInt, Min, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class CharacterDetailDto {
  @Type(() => Number)
  @IsDefined({ message: `ChDlDto-ICBE001: Id cannot be empty` })
  @IsInt({ message: `ChDlDto-IMBAN001: Id must be a number` })
  @Min(1, { message: `ChDlDto-ICBLTO001: Id cannot be less than one` })
  id: number;
}
