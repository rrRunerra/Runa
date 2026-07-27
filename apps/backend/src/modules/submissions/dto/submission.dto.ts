import { IsString, IsOptional, IsInt, IsObject, IsIn } from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  @IsIn(['anime', 'manga', 'tv', 'movie', 'game', 'book'])
  mediaType!: string;

  @IsString()
  @IsIn(['CREATE', 'EDIT'])
  actionType!: string;

  @IsOptional()
  @IsInt()
  mediaId?: number;

  @IsObject()
  data!: Record<string, any>;
}

export class ReviewSubmissionDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
