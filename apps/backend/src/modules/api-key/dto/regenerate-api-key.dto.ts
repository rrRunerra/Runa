import { IsNotEmpty, IsUUID } from 'class-validator';

export class RegenerateApiKeyDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}
