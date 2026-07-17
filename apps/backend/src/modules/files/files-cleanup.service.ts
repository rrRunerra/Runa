import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AbortMultipartUploadCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { FilesRepository } from './files.repository';
import { FilesService } from './files.service';

/**
 * FsCsSve- — FilesCleanupService
 *
 * Runs once per day and aborts any S3 multipart uploads that started more than
 * 48 hours ago and were never completed (browser crash, network loss, etc.).
 * Also hard-deletes the orphaned LaceraFile stub rows from the database so the
 * pending file never appears in user listings.
 */
@Injectable()
export class FilesCleanupService {
  private readonly logger = new Logger(FilesCleanupService.name);
  private readonly moduleCode = 'FsCsSve-';

  private readonly s3: S3Client;

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly filesService: FilesService,
  ) {
    this.s3 = new S3Client({
      endpoint: process.env.RUSTFS_ENDPOINT,
      region: process.env.RUSTFS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.RUSTFS_ACCESS_KEY ?? '',
        secretAccessKey: process.env.RUSTFS_SECRET_KEY ?? '',
      },
      forcePathStyle: true,
    });
  }

  /**
   * Runs every day at midnight.
   * Queries all LaceraUpload rows where expiresAt < now() and completedAt IS NULL.
   * For each, aborts the S3 multipart upload and removes the orphan DB records.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupAbandonedUploads(): Promise<void> {
    this.logger.log('[Cleanup] Scanning for expired multipart uploads...');

    const expired = await this.filesRepository.findExpiredLaceraUploads();

    if (expired.length === 0) {
      this.logger.log('[Cleanup] No expired uploads found.');
      return;
    }

    this.logger.log(`[Cleanup] Found ${expired.length} expired upload(s) to abort.`);

    for (const upload of expired) {
      try {
        // Abort the S3 multipart upload session
        await this.s3.send(
          new AbortMultipartUploadCommand({
            Bucket: upload.bucket,
            Key: upload.key,
            UploadId: upload.uploadId,
          }),
        );
        this.logger.log(
          `[Cleanup] Aborted S3 upload uploadId="${upload.uploadId}" key="${upload.key}"`,
        );
      } catch (err: unknown) {
        // Log but continue — the upload may have already been aborted or never started
        this.logger.warn(
          `[Cleanup] Failed to abort S3 upload uploadId="${upload.uploadId}":`,
          err,
        );
      }

      try {
        // Remove the LaceraUpload manifest row
        await this.filesRepository.deleteLaceraUpload(upload.fileId);

        // Remove the orphaned LaceraFile stub
        const fileStub = await this.filesRepository.findLaceraFileById(
          upload.fileId,
        );
        if (fileStub) {
          await this.filesRepository.deleteLaceraFileById(upload.fileId);
        }
      } catch (err: unknown) {
        this.logger.error(
          `[Cleanup] Failed to remove DB records for fileId="${upload.fileId}":`,
          err,
        );
      }
    }

    this.logger.log(
      `[Cleanup] Done. ${expired.length} expired upload(s) processed.`,
    );
  }
}
