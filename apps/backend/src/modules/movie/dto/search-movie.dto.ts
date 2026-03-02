import { IsString, IsNotEmpty } from 'class-validator';

export class SearchMovieDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
