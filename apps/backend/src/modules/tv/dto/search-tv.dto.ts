import { IsString, IsNotEmpty } from 'class-validator';

export class SearchTvDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
