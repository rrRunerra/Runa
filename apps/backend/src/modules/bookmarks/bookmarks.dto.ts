import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateBookmarkDto {
  @IsString({ message: 'CeBkDto-NMBAS001: Name must be a string' })
  @IsNotEmpty({ message: 'CeBkDto-NMNBE001: Name must not be empty' })
  name!: string;

  @IsString({ message: 'CeBkDto-DMBAS001: Description must be a string' })
  @IsNotEmpty({ message: 'CeBkDto-DMNBE001: Description must not be empty' })
  description!: string;

  @IsString({ message: 'CeBkDto-RMBAS001: Redirect must be a string' })
  @IsNotEmpty({ message: 'CeBkDto-RMNBE001: Redirect must not be empty' })
  redirect!: string;

  @IsArray({ message: 'CeBkDto-SMBAA001: Stars must be an array' })
  @IsNotEmpty({ message: 'CeBkDto-SMNBE001: Stars must not be empty' })
  stars!: any[];

  @IsArray({ message: 'CeBkDto-CMBAA001: Connections must be an array' })
  @IsNotEmpty({ message: 'CeBkDto-CMNBE001: Connections must not be empty' })
  connections!: number[][];

  @IsString({ message: 'CeBkDto-IMBAS001: Icon must be a string' })
  @IsOptional()
  icon?: string;

  @IsString({ message: 'CeBkDto-CCMBAS001: Connection color must be a string' })
  @IsOptional()
  connectionColor?: string;

  @IsString({ message: 'CeBkDto-SCMBAS001: Star color must be a string' })
  @IsOptional()
  starColor?: string;
}
