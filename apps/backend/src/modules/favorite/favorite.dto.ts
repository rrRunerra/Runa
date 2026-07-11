import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { FavoriteType } from '@runa/database';

export class AddFavoriteDto {
  @IsEnum(FavoriteType, {
    message: 'AdFtdto-TMBOTO001: Type must be one of FavoriteType',
  })
  @IsNotEmpty({ message: 'AdFtdto-TMNBE001: Type must not be empty' })
  type!: FavoriteType;

  @IsString({ message: 'AdFtdto-TIMBAS001: Target id must be a string' })
  @IsNotEmpty({ message: 'AdFtdto-TIMNBE001: Target id must not be empty' })
  targetId!: string;
}
