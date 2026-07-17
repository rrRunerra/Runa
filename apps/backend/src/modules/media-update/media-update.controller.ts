import { Controller, Post, UseGuards } from '@nestjs/common';
import { MediaUpdateService } from './media-update.service';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { RunaFlags } from '@runa/permissions';

@Controller('media-update')
@UseGuards(AuthGuard, PermissionsGuard)
export class MediaUpdateController {
  constructor(private readonly mediaUpdateService: MediaUpdateService) {}

  @Post('refresh')
  @Permissions([RunaFlags.ADMINISTRATOR])
  async triggerRefresh(): Promise<{ message: string }> {
    // Run the update in the background so we do not block the request
    this.mediaUpdateService.updateRecentMedia().catch((err: unknown) => {
      // Errors are already logged inside updateRecentMedia, but log here too
      console.error('Triggered media update background execution failed:', err);
    });

    return { message: 'Media update job triggered in the background' };
  }
}
