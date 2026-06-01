import { Injectable, BadRequestException, NotFoundException, StreamableFile } from '@nestjs/common';
import { existsSync, createReadStream, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR
      ? resolve(process.env.UPLOAD_DIR)
      : resolve(process.cwd(), 'uploads');

    // Ensure upload directory exists
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File, username: string): Promise<{ id: string; filename: string; url: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const originalExt = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    if (!originalExt || !allowedExtensions.includes(originalExt)) {
      throw new BadRequestException('Invalid file extension. Only jpg, png, and gif are allowed.');
    }

    // Sanitize username for filename safety (allow only alphanumeric, dashes, underscores)
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueId = randomUUID();
    const filename = `${sanitizedUsername}_${uniqueId}.${originalExt}`;
    const filePath = join(this.uploadDir, filename);

    try {
      writeFileSync(filePath, file.buffer);
    } catch (error) {
      throw new BadRequestException('Failed to write file to disk');
    }

    const url = `/media/image/${filename}`;

    return {
      id: uniqueId,
      filename,
      url,
    };
  }

  getFileStream(filename: string): { stream: StreamableFile; contentType: string } {
    const filePath = resolve(this.uploadDir, filename);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(this.uploadDir)) {
      throw new BadRequestException('Invalid file path');
    }

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
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
}
