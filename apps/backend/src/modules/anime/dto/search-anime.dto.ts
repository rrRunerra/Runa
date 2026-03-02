import { IsString, IsNotEmpty } from 'class-validator';

export class SearchAnimeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
