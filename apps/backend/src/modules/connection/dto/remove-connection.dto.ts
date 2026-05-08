import { IsOptional, IsString } from 'class-validator';

export class RemoveConnectionDto {
  @IsString()
  @IsOptional()
  username?: string;
}
