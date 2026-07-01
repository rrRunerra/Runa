import { IsString, IsNotEmpty, IsInt, Min, IsDefined } from 'class-validator';

export class SearchAnimeDto {
  @IsString({ message: 'ShAeDto-NMBAS001: Name must be a string' })
  @IsNotEmpty({ message: 'ShAeDto-NMNBE001: Name must not be empty' })
  name: string;
}

export class AnimeDetailDto {
  @IsDefined({ message: `AeDlDto-ICBE001: Id cannot be empty` })
  @IsInt({ message: `AeDlDto-IMBAN001: Id must be a number` })
  @Min(1, { message: `AeDlDto-ICBLTO001: Id cannot be less than one` })
  id: number;
}
