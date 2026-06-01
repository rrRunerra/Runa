import { IsNotEmpty, IsEnum, IsString } from 'class-validator';
import { FavoriteType } from '@runa/database';

export class CreateFavoriteDto {
  @IsEnum(FavoriteType, {
    message: 'type must be one of: ANIME, MANGA, MOVIE, TV, BOOK, USER',
  })
  @IsNotEmpty()
  type!: FavoriteType;

  @IsString()
  @IsNotEmpty()
  mediaId!: string;
}
