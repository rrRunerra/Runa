import { IsString, IsNotEmpty } from 'class-validator';

export class SearchMangaDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
