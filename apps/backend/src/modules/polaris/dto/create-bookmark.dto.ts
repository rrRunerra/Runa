import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateBookmarkDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  redirect!: string;

  @IsArray()
  @IsNotEmpty()
  stars!: any[];

  @IsArray()
  @IsNotEmpty()
  connections!: number[][];

  @IsString()
  @IsOptional()
  icon?: string;
}
