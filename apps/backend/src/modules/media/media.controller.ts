import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Response,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response as ExpressResponse } from 'express';
import { MediaService } from './media.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('media')
export class MediaController {
  private readonly moduleCode = 'MeCtr-';

  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // 4MB limit: 4 * 1024 * 1024 = 4,194,304 bytes
          new MaxFileSizeValidator({
            maxSize: 4 * 1024 * 1024,
            message: 'File size must not exceed 4MB.',
          }),
          // Only JPG, PNG, GIF
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/jpg|image\/png|image\/gif)$/i,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: any,
  ) {
    const username = req.user?.username || 'anonymous';
    return this.mediaService.saveFile(file, username);
  }

  @Get('image/:filename')
  @Public()
  async getFile(
    @Param('filename') filename: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const { stream, contentType } = this.mediaService.getFileStream(filename);
    res.set({
      'Content-Type': contentType,
    });
    return stream;
  }
}
