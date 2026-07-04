import { IsString, IsNotEmpty, IsInt, Min, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchBookDto {
  @IsString({ message: 'ShBkDto-NMBAS001: Name must be a string' })
  @IsNotEmpty({ message: 'ShBkDto-NMNBE001: Name must not be empty' })
  name: string;
}

export class BookDetailDto {
  @Type(() => Number)
  @IsDefined({ message: 'BkDlDto-ICBE001: Id cannot be empty' })
  @IsInt({ message: 'BkDlDto-IMBAN001: Id must be a number' })
  @Min(1, { message: 'BkDlDto-ICBLTO001: Id cannot be less than one' })
  id: number;
}

export class BookRefreshDto {
  @Type(() => Number)
  @IsDefined({ message: 'BkRhDto-ICBE001: Id cannot be empty' })
  @IsInt({ message: 'BkRhDto-IMBAN001: Id must be a number' })
  @Min(1, { message: 'BkRhDto-ICBLTO001: Id cannot be less than one' })
  id: number;
}
