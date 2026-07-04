import { IsString, IsNotEmpty, IsDefined, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchMangaDto {
  @IsString({ message: 'ShMaDto-NMBAS001: Name must be a string' })
  @IsNotEmpty({ message: 'ShMaDto-NMNBE001: Name must not be empty' })
  name: string;
}

export class MangaDetailDto {
  @Type(() => Number)
  @IsDefined({ message: `MaDlDto-ICBE001: Id cannot be empty` })
  @IsInt({ message: `MaDlDto-IMBAN001: Id must be a number` })
  @Min(1, { message: `MaDlDto-ICBLTO001: Id cannot be less than one` })
  id: number;
}

export class MangaRefreshDto {
  @Type(() => Number)
  @IsDefined({ message: `MaRhDto-ICBE001: Id cannot be empty` })
  @IsInt({ message: `MaRhDto-IMBAN001: Id must be a number` })
  @Min(1, { message: `MaRhDto-ICBLTO001: Id cannot be less than one` })
  id: number;
}
