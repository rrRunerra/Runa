import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
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
import { jwtVerify } from 'jose';

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
  // GET /lacerta/list — authenticated
  // ---------------------------------------------------------------------------

  @Get('files/lacerta/list')
  async listLaceraFiles(@Req() req: ExtendedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA004`, {
        message: 'Unauthenticated',
      });
    }
    return this.filesService.listLaceraFiles(userId);
  }

  // ---------------------------------------------------------------------------
  // POST /lacerta/folder — authenticated, folder creation
  // ---------------------------------------------------------------------------

  @Post('files/lacerta/folder')
  async createLaceraFolder(
    @Body('name') name: string,
    @Body('wrappedKey') wrappedKey: string,
    @Body('parentId') parentId: string,
    @Body('isVault') isVault: boolean,
    @Req() req: ExtendedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA005`, {
        message: 'Unauthenticated',
      });
    }
    if (!name || !wrappedKey) {
      throw new rrBadRequestException(`${this.moduleCode}FLD001`, {
        message: 'Name and wrappedKey are required',
      });
    }
    return this.filesService.createLaceraFolder(
      userId,
      name,
      wrappedKey,
      parentId,
      isVault,
    );
  }

  // ---------------------------------------------------------------------------
  // POST /lacerta/upload — authenticated, any binary
  // ---------------------------------------------------------------------------

  @Post('files/lacerta/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadLaceraFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('wrappedKey') wrappedKey: string,
    @Body('name') name: string,
    @Body('size') sizeStr: string,
    @Body('type') type: string,
    @Body('parentId') parentId: string,
    @Body('isVault') isVaultStr: string,
    @Req() req: ExtendedRequest,
  ): Promise<UploadLaceraEntity> {
    if (!file) {
      throw new rrBadRequestException(`${this.moduleCode}FIR002`, {
        message: 'File is required',
      });
    }

    if (!wrappedKey || !name) {
      throw new rrBadRequestException(`${this.moduleCode}WKIR001`, {
        message: 'wrappedKey and name are required',
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA002`, {
        message: 'Unauthenticated',
      });
    }

    const size = sizeStr ? parseInt(sizeStr, 10) : file.size;
    const isVault = isVaultStr === 'true';

    return this.filesService.uploadLaceraFile(
      file,
      userId,
      wrappedKey,
      name,
      size,
      type || file.mimetype,
      parentId,
      isVault,
    );
  }

  // ---------------------------------------------------------------------------
  // PATCH /lacerta/:id/metadata — authenticated
  // ---------------------------------------------------------------------------

  @Patch('files/lacerta/:id/metadata')
  async updateLaceraMetadata(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      parentId?: string | null;
      isTrash?: boolean;
      isVault?: boolean;
      isPublic?: boolean;
    },
    @Req() req: ExtendedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA006`, {
        message: 'Unauthenticated',
      });
    }
    return this.filesService.updateLaceraMetadata(id, userId, body);
  }

  // ---------------------------------------------------------------------------
  // PUT /lacerta/:id — owner or public (guest saves)
  // ---------------------------------------------------------------------------

  @Public()
  @Put('files/lacerta/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async updateLaceraFileContent(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('size') sizeStr: string,
    @Req() req: ExtendedRequest,
  ) {
    if (!file) {
      throw new rrBadRequestException(`${this.moduleCode}FIR003`, {
        message: 'File is required',
      });
    }

    let userId: string | undefined = undefined;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
        const { payload } = await jwtVerify(token, secret);
        userId = payload.sub;
      } catch (err) {
        // Invalid or expired token, keep userId undefined
      }
    }

    const size = sizeStr ? parseInt(sizeStr, 10) : file.size;
    return this.filesService.updateLaceraFileContent(id, userId, file, size);
  }

  // ---------------------------------------------------------------------------
  // DELETE /lacerta/:id — authenticated
  // ---------------------------------------------------------------------------

  @Delete('files/lacerta/:id')
  async deleteLaceraFile(
    @Param('id') id: string,
    @Req() req: ExtendedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA007`, {
        message: 'Unauthenticated',
      });
    }
    await this.filesService.deleteLaceraFile(id, userId);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // POST /lacerta/:id/share — authenticated
  // ---------------------------------------------------------------------------

  @Post('files/lacerta/:id/share')
  async shareLaceraFile(
    @Param('id') id: string,
    @Body('recipientId') recipientId: string,
    @Body('wrappedKey') wrappedKey: string,
    @Req() req: ExtendedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA008`, {
        message: 'Unauthenticated',
      });
    }
    if (!recipientId || !wrappedKey) {
      throw new rrBadRequestException(`${this.moduleCode}SHR001`, {
        message: 'recipientId and wrappedKey are required',
      });
    }
    return this.filesService.shareLaceraFile(
      id,
      userId,
      recipientId,
      wrappedKey,
    );
  }

  // ---------------------------------------------------------------------------
  // DELETE /lacerta/:id/share/:recipientId — authenticated
  // ---------------------------------------------------------------------------

  @Delete('files/lacerta/:id/share/:recipientId')
  async unshareLaceraFile(
    @Param('id') id: string,
    @Param('recipientId') recipientId: string,
    @Req() req: ExtendedRequest,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA009`, {
        message: 'Unauthenticated',
      });
    }
    await this.filesService.unshareLaceraFile(id, userId, recipientId);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // GET /lacerta/:file — owner or public, wildcard must be last
  // ---------------------------------------------------------------------------

  @Public()
  @Get('files/lacerta/:id/metadata')
  async getLaceraFileMetadata(
    @Param('id') id: string,
  ): Promise<{ id: string; name: string; size: number | null; type: string | null; isPublic: boolean }> {
    return this.filesService.getLaceraFileMetadata(id);
  }

  // ---------------------------------------------------------------------------
  // GET /lacerta/:file — owner or public, wildcard must be last
  // ---------------------------------------------------------------------------

  @Public()
  @Get('files/lacerta/*path')
  async getLaceraFile(
    @Param('path') file: string | string[],
    @Req() req: ExtendedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const fileKey = Array.isArray(file) ? file.join('/') : file;

    // Manually parse JWT token if provided (since @Public() skips global AuthGuard user population)
    let userId: string | undefined = undefined;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
        const { payload } = await jwtVerify(token, secret);
        userId = payload.sub;
      } catch (err) {
        // Invalid or expired token, keep userId undefined
      }
    }

    const stream = await this.filesService.getLaceraFile(fileKey, userId);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    stream.pipe(res);
  }

  // ---------------------------------------------------------------------------
  // PATCH /lacerta/:file/visibility — owner only
  // ---------------------------------------------------------------------------

  @Patch('files/lacerta/*path/visibility')
  async toggleLaceraVisibility(
    @Param('path') file: string | string[],
    @Req() req: ExtendedRequest,
  ): Promise<LaceraVisibilityEntity> {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}UA003`, {
        message: 'Unauthenticated',
      });
    }

    const fileKey = Array.isArray(file) ? file.join('/') : file;
    return this.filesService.toggleLaceraVisibility(fileKey, userId);
  }
}
