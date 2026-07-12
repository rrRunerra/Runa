import { IsInt, Min, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class ActorDetailDto {
  @Type(() => Number)
  @IsDefined({ message: `AcDlDto-ICBE001: Id cannot be empty` })
  @IsInt({ message: `AcDlDto-IMBAN001: Id must be a number` })
  @Min(1, { message: `AcDlDto-ICBLTO001: Id cannot be less than one` })
  id: number;
}
