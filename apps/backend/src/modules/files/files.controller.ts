import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Query,
  Req,
  Res,
  HttpStatus,
  HttpCode,
  Logger,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import * as crypto from 'crypto';
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
import { FilesRepository } from './files.repository';
import { encrypt, decrypt } from '@runa/crypto/node';
import type {
  UploadPublicEntity,
  UploadLaceraEntity,
  LaceraVisibilityEntity,
} from './files.entity';

// ---------------------------------------------------------------------------
// OnlyOffice Encryption crypto helpers
// ---------------------------------------------------------------------------

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
  private readonly logger = new Logger(FilesController.name);
  private readonly ooSecret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET,
  );

  constructor(
    private readonly filesService: FilesService,
    private readonly filesRepository: FilesRepository,
  ) {}

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
  // Secure Vault management endpoints
  // ---------------------------------------------------------------------------

  @Get('files/lacerta/vault/status')
  async getVaultStatus(@Req() req: ExtendedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}VAULT001`, {
        message: 'Unauthenticated',
      });
    }
    const hasPin = await this.filesService.hasVaultPin(userId);
    return { hasPin };
  }

  @Post('files/lacerta/vault/setup')
  async setupVaultPin(@Req() req: ExtendedRequest, @Body('pin') pin: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}VAULT002`, {
        message: 'Unauthenticated',
      });
    }
    if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      throw new rrBadRequestException(`${this.moduleCode}VAULT003`, {
        message: 'PIN must be a 6-digit number',
      });
    }
    await this.filesService.setupVaultPin(userId, pin);
    return { success: true };
  }

  @Post('files/lacerta/vault/verify')
  async verifyVaultPin(@Req() req: ExtendedRequest, @Body('pin') pin: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}VAULT004`, {
        message: 'Unauthenticated',
      });
    }
    if (!pin) {
      throw new rrBadRequestException(`${this.moduleCode}VAULT005`, {
        message: 'PIN is required',
      });
    }
    const success = await this.filesService.verifyVaultPin(userId, pin);
    return { success };
  }

  @Delete('files/lacerta/vault/reset')
  async resetVault(@Req() req: ExtendedRequest) {
    const userId = req.user?.id;
    if (!userId) {
      throw new rrUnauthorizedException(`${this.moduleCode}VAULT006`, {
        message: 'Unauthenticated',
      });
    }
    await this.filesService.resetVault(userId);
    return { success: true };
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
  async deleteLaceraFile(@Param('id') id: string, @Req() req: ExtendedRequest) {
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
    @Body('allowEdit') allowEdit: boolean,
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
      allowEdit,
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
  // OnlyOffice E2EE — download (decrypt on-the-fly) — MUST be before wildcard
  // ---------------------------------------------------------------------------

  @Public()
  @Get('files/lacerta/onlyoffice/download/:id')
  async onlyofficeDownload(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @Query('fileKey') fileKey: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `[OO-DL] id="${id}" hasToken=${!!token} hasFileKey=${!!fileKey}`,
    );

    if (!fileKey) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: 'fileKey required' });
      return;
    }

    const file = await this.filesRepository.findLaceraFileById(id);
    if (!file) {
      this.logger.warn(`[OO-DL] File not found in DB: id="${id}"`);
      res.status(HttpStatus.NOT_FOUND).json({ message: 'File not found' });
      return;
    }
    this.logger.log(
      `[OO-DL] Found file key="${file.key}" userId="${file.userId}"`,
    );

    let hasAccess = false;
    let userId: string | undefined;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, this.ooSecret);
        userId = payload.sub;
        if (userId) {
          const isOwner = file.userId === userId;
          const isShared = file.shares.some((s: any) => s.userId === userId);
          this.logger.log(
            `[OO-DL] JWT userId="${userId}" isOwner=${isOwner} isShared=${isShared}`,
          );
          if (isOwner || isShared) hasAccess = true;
        }
      } catch (err: any) {
        this.logger.warn(`[OO-DL] JWT verify failed: ${err.message}`);
      }
    }
    if (!hasAccess && file.isPublic) hasAccess = true;
    if (!hasAccess) {
      res.status(HttpStatus.FORBIDDEN).json({ message: 'Forbidden' });
      return;
    }

    try {
      const stream = await this.filesService.getLaceraFileStreamDirect(
        file.key,
      );
      if (!stream) {
        this.logger.error(`[OO-DL] S3 object missing for key="${file.key}"`);
        res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'File data not found in storage' });
        return;
      }
      this.logger.log(`[OO-DL] Got S3 stream, reading...`);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      const encryptedBuffer = Buffer.concat(chunks);
      this.logger.log(
        `[OO-DL] Read ${encryptedBuffer.length} bytes, decrypting...`,
      );
      const keyBuffer = Buffer.from(fileKey, 'base64url');
      const decrypted = decrypt(encryptedBuffer, keyBuffer);
      this.logger.log(
        `[OO-DL] Decrypted to ${decrypted.length} bytes, sending.`,
      );
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(file.name)}"`,
      );
      res.send(decrypted);
    } catch (err: any) {
      this.logger.error(`[OO-DL] Error: ${err.message}`, err.stack);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Failed to process document' });
    }
  }

  // ---------------------------------------------------------------------------
  // OnlyOffice E2EE — callback (save edited file back to S3) — MUST be before wildcard
  // ---------------------------------------------------------------------------

  @Public()
  @Post('files/lacerta/onlyoffice/callback/:id')
  @HttpCode(200)
  async onlyofficeCallback(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @Query('fileKey') fileKey: string,
    @Body() body: any,
  ): Promise<{ error: number; message?: string }> {
    if (body.status !== 2 && body.status !== 6) return { error: 0 };
    if (!fileKey) return { error: 1, message: 'fileKey required' };

    const file = await this.filesRepository.findLaceraFileById(id);
    if (!file) return { error: 1, message: 'File not found' };

    let hasAccess = false;
    let userId: string | undefined;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, this.ooSecret);
        userId = payload.sub;
        if (userId) {
          const isOwner = file.userId === userId;
          const isShared = file.shares.some((s: any) => s.userId === userId);
          if (isOwner || isShared) hasAccess = true;
        }
      } catch {
        /* invalid token */
      }
    }
    if (!hasAccess && file.isPublic) hasAccess = true;
    if (!hasAccess) return { error: 1, message: 'Forbidden' };

    try {
      const downloadRes = await fetch(body.url);
      if (!downloadRes.ok)
        throw new Error(
          `OnlyOffice download failed: ${downloadRes.statusText}`,
        );
      const plaintextBuffer = Buffer.from(await downloadRes.arrayBuffer());
      const keyBuffer = Buffer.from(fileKey, 'base64url');
      const encryptedBuffer = encrypt(plaintextBuffer, keyBuffer);
      await this.filesService.updateLaceraFileContent(
        id,
        userId,
        {
          buffer: encryptedBuffer,
          size: encryptedBuffer.length,
          mimetype: file.type,
        } as any,
        encryptedBuffer.length,
      );
      this.logger.log(`[OO-CB] Saved document id="${id}"`);
      return { error: 0 };
    } catch (err: any) {
      this.logger.error(`[OO-CB] Error: ${err.message}`, err.stack);
      return { error: 1, message: 'Failed to save file' };
    }
  }

  // ---------------------------------------------------------------------------
  // GET /lacerta/:file — owner or public, wildcard must be last
  // ---------------------------------------------------------------------------

  @Public()
  @Get('files/lacerta/:id/metadata')
  async getLaceraFileMetadata(@Param('id') id: string): Promise<{
    id: string;
    name: string;
    size: number | null;
    type: string | null;
    isPublic: boolean;
  }> {
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
