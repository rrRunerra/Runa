import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

import { FavoriteType } from '@runa/database';

export class AddFavoriteDto {
  @IsEnum(FavoriteType, {
    message: `type must be one of: ${Object.values(FavoriteType).join(', ')}`,
  })
  @IsNotEmpty()
  type!: FavoriteType;

  @IsString()
  @IsNotEmpty()
  targetId!: string;
}
