import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '@runa/database';

export class GetReviewsDto {
  @IsEnum(MediaType)
  @IsNotEmpty()
  mediaType: MediaType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  mediaId: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number = 10;
}

export class CreateReviewDto {
  @IsEnum(MediaType)
  @IsNotEmpty()
  mediaType: MediaType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  mediaId: number;

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @Type(() => Number)
  @Min(0)
  @Max(100)
  score: number;

  @IsOptional()
  @IsBoolean()
  isSpoiler?: boolean;
}

export class UpdateReviewDto {
  @IsEnum(MediaType)
  @IsNotEmpty()
  mediaType: MediaType;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsBoolean()
  isSpoiler?: boolean;
}

export class DeleteReviewDto {
  @IsEnum(MediaType)
  @IsNotEmpty()
  mediaType: MediaType;
}

export class ReviewParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}
