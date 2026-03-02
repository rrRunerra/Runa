import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
