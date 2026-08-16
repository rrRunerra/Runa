import { IsInt, Min, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class StudioDetailDto {
  @Type(() => Number)
  @IsDefined({ message: `StDlDto-ICBE001: Id cannot be empty` })
  @IsInt({ message: `StDlDto-IMBAN001: Id must be a number` })
  @Min(1, { message: `StDlDto-ICBLTO001: Id cannot be less than one` })
  id: number;
}
