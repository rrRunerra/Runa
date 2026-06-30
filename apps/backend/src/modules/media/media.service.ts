import { Injectable, StreamableFile, Logger } from '@nestjs/common';
import {
  existsSync,
  createReadStream,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import {
  rrBadRequestException,
  rrNotFoundException,
} from 'src/providers/error';

@Injectable()
export class MediaService {
  private readonly uploadDir: string;
  private readonly logger = new Logger(MediaService.name);
  private readonly moduleCode = 'MeSve-';

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR
      ? resolve(process.env.UPLOAD_DIR)
      : resolve(process.cwd(), 'uploads');

    // Ensure upload directory exists
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(
    file: Express.Multer.File,
    username: string,
  ): Promise<{ id: string; filename: string; url: string }> {
    if (!file) {
      throw new rrBadRequestException(`${this.moduleCode}NFU001`, {
        message: 'No file uploaded',
      });
    }

    const originalExt = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    if (!originalExt || !allowedExtensions.includes(originalExt)) {
      throw new rrBadRequestException(`${this.moduleCode}IFE001`, {
        message: 'Invalid file extension. Only jpg, png, and gif are allowed.',
      });
    }

    // Sanitize username for filename safety (allow only alphanumeric, dashes, underscores)
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueId = randomUUID();
    const filename = `${sanitizedUsername}_${uniqueId}.${originalExt}`;
    const filePath = join(this.uploadDir, filename);

    try {
      writeFileSync(filePath, file.buffer);
    } catch (error) {
      throw new rrBadRequestException(`${this.moduleCode}FTWFTD001`, {
        message: 'Failed to write file to disk',
      });
    }

    const url = `/media/image/${filename}`;

    return {
      id: uniqueId,
      filename,
      url,
    };
  }

  getFileStream(filename: string): {
    stream: StreamableFile;
    contentType: string;
  } {
    const filePath = resolve(this.uploadDir, filename);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(this.uploadDir)) {
      throw new rrBadRequestException(`${this.moduleCode}IFP001`, {
        message: 'Invalid file path',
      });
    }

    if (!existsSync(filePath)) {
      throw new rrNotFoundException(`${this.moduleCode}FNF001`, {
        message: 'File not found',
      });
    }

    const ext = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';

    const fileStream = createReadStream(filePath);
    return {
      stream: new StreamableFile(fileStream),
      contentType,
    };
  }

  deleteFile(filename: string): void {
    const filePath = resolve(this.uploadDir, filename);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(this.uploadDir)) {
      throw new rrBadRequestException(`${this.moduleCode}IFP002`, {
        message: 'Invalid file path',
      });
    }

    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
        this.logger.log(`Deleted file: ${filePath}`);
      } catch (error) {
        this.logger.error(`Failed to delete file: ${filePath}`, error);
      }
    } else {
      this.logger.warn(`File not found for deletion: ${filePath}`);
    }
  }

  deleteFileByUrl(url: string | null | undefined): void {
    if (!url || !url.startsWith('/media/image/')) {
      return;
    }
    const filename = url.substring('/media/image/'.length);
    this.deleteFile(filename);
  }
}
