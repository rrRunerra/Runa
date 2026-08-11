import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MediaType } from '@runa/database';

export class RecommendationParamDto {
  @Type(() => Number)
  @IsInt()
  id: number;
}

export class GetRecommendationsDto {
  @IsEnum(MediaType)
  @IsNotEmpty()
  mediaType: MediaType;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
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

  @IsOptional()
  @IsEnum(['score', 'newest'])
  sort?: 'score' | 'newest' = 'score';
}

export class CreateRecommendationDto {
  @IsEnum(MediaType)
  @IsNotEmpty()
  sourceType: MediaType;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  sourceId: number;

  @IsEnum(MediaType)
  @IsNotEmpty()
  targetType: MediaType;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  targetId: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;
}

export class UpdateRecommendationDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;
}

export enum VoteActionType {
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE',
  REMOVE = 'REMOVE',
}

export class VoteRecommendationDto {
  @IsEnum(VoteActionType)
  @IsNotEmpty()
  voteType: VoteActionType;
}
