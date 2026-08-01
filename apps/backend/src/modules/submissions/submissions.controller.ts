import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Param,
  Query,
  Req,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import type { ExtendedRequest } from '../../common/guards/auth/auth.types';

import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, ReviewSubmissionDto } from './dto/submission.dto';

@Controller('aquila/submissions')
@UseGuards(AuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  private getUserId(req: ExtendedRequest): string {
    const id = req.user?.id;
    if (!id) {
      throw new UnauthorizedException('Unauthenticated');
    }
    return id;
  }

  @Post()
  async createSubmission(
    @Req() req: ExtendedRequest,
    @Body() dto: CreateSubmissionDto,
  ) {
    const userId = this.getUserId(req);
    const userPermissions = req.user?.permissions || [];
    return this.submissionsService.createSubmission(userId, dto, userPermissions);
  }

  @Get()
  async getPendingSubmissions(
    @Req() req: ExtendedRequest,
    @Query('mediaType') mediaType?: string,
  ) {
    const userPermissions = req.user?.permissions || [];
    // Requires at least one manage permission or admin
    const canView =
      this.submissionsService.canUserManage('anime', userPermissions) ||
      this.submissionsService.canUserManage('manga', userPermissions) ||
      this.submissionsService.canUserManage('tv', userPermissions) ||
      this.submissionsService.canUserManage('movie', userPermissions) ||
      this.submissionsService.canUserManage('game', userPermissions) ||
      this.submissionsService.canUserManage('book', userPermissions);

    if (!canView) {
      throw new ForbiddenException('You do not have permission to review media submissions');
    }

    return this.submissionsService.getPendingSubmissions(mediaType);
  }

  @Post(':id/approve')
  async approveSubmission(
    @Req() req: ExtendedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.getUserId(req);
    const userPermissions = req.user?.permissions || [];

    return this.submissionsService.approveSubmission(id, userId);
  }

  @Post(':id/reject')
  async rejectSubmission(
    @Req() req: ExtendedRequest,
    @Param('id') id: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    const userId = this.getUserId(req);
    const userPermissions = req.user?.permissions || [];

    return this.submissionsService.rejectSubmission(id, userId, dto.rejectionReason);
  }

  @Public()
  @Get('search/characters')
  async searchCharacters(@Query('q') query: string) {
    return this.submissionsService.searchCharacters(query || '');
  }

  @Public()
  @Get('search/actors')
  async searchActors(@Query('q') query: string) {
    return this.submissionsService.searchActors(query || '');
  }

  @Public()
  @Get('search/relations')
  async searchRelations(
    @Query('mediaType') mediaType: string,
    @Query('q') query: string,
  ) {
    return this.submissionsService.searchRelations(mediaType || 'anime', query || '');
  }

  @Public()
  @Get('search/studios')
  async searchStudios(@Query('q') query: string) {
    return this.submissionsService.searchStudios(query || '');
  }
}
