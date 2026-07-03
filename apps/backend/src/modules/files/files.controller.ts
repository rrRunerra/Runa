import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  rrBadRequestException,
  rrUnauthorizedException,
} from 'src/providers/error';
import type { ExtendedRequest } from '../../common/guards/auth/auth.types';

import { FilesService } from './files.service';
import type {
  UploadPublicEntity,
  UploadLaceraEntity,
  LaceraVisibilityEntity,
} from './files.entity';

const FOUR_MB = 4 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
]);

@Controller()
@UseGuards(AuthGuard)
export class FilesController {
  private readonly moduleCode = 'FsCtr-';

  constructor(private readonly filesService: FilesService) {}

  // ---------------------------------------------------------------------------
  // GET /public/:file — public, no auth
  // ---------------------------------------------------------------------------

  @Public()
  @Get('public/*path')
  async getPublicFile(
    @Param('path') file: string,
    @Res() res: Response,
  ): Promise<void> {
    const stream = await this.filesService.getPublicFile(file);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    stream.pipe(res);
  }

  // ---------------------------------------------------------------------------
  // POST /public/upload — authenticated, images only, max 4 MB
  // ---------------------------------------------------------------------------

  @Post('public/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: FOUR_MB },
    }),
  )
  async uploadPublicFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: ExtendedRequest,
  ): Promise<UploadPublicEntity> {
    if (!file) {
      throw new rrBadRequestException(`${this.moduleCode}FIR001`, {
        message: 'File is required',
      });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new rrBadRequestException(`${this.moduleCode}IFIT001`, {
        message: 'Invalid file type. Only image formats are allowed.',
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA001`, {
        message: 'Unauthenticated',
      });
    }

    return this.filesService.uploadPublicFile(file, userId);
  }

  // ---------------------------------------------------------------------------
  // GET /lacerta/:file — owner or public
  // ---------------------------------------------------------------------------

  @Public()
  @Get('lacerta/*path')
  async getLaceraFile(
    @Param('path') file: string,
    @Req() req: ExtendedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const stream = await this.filesService.getLaceraFile(file, req.user?.id);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    stream.pipe(res);
  }

  // ---------------------------------------------------------------------------
  // POST /lacerta/upload — authenticated, any binary
  // ---------------------------------------------------------------------------

  @Post('lacerta/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadLaceraFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('wrappedKey') wrappedKey: string,
    @Req() req: ExtendedRequest,
  ): Promise<UploadLaceraEntity> {
    if (!file) {
      throw new rrBadRequestException(`${this.moduleCode}FIR002`, {
        message: 'File is required',
      });
    }

    if (!wrappedKey) {
      throw new rrBadRequestException(`${this.moduleCode}WKIR001`, {
        message: 'wrappedKey is required',
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA002`, {
        message: 'Unauthenticated',
      });
    }

    return this.filesService.uploadLaceraFile(file, userId, wrappedKey);
  }

  // ---------------------------------------------------------------------------
  // PATCH /lacerta/:file/visibility — owner only
  // ---------------------------------------------------------------------------

  @Patch('lacerta/*path/visibility')
  async toggleLaceraVisibility(
    @Param('path') file: string,
    @Req() req: ExtendedRequest,
  ): Promise<LaceraVisibilityEntity> {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA003`, {
        message: 'Unauthenticated',
      });
    }

    return this.filesService.toggleLaceraVisibility(file, userId);
  }
}
