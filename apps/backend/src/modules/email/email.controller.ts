import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Param,
  Put,
  Req,
  Delete,
  Response,
  StreamableFile,
  Query,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AuthGuard } from '../../common/guards/auth/auth.guard';
import { EmailService, EmailAutoconfigResult } from './email.service';
import { EmailSyncService } from './email-sync.service';
import { EmailAccountDto, SendEmailDto } from './email.dto';

@Controller('/emails')
@UseGuards(AuthGuard)
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly emailSyncService: EmailSyncService,
  ) {}

  // ─────────────────────────── ACCOUNTS (Collection) ───────────────────────────

  @Get()
  async getEmailAccounts(@Req() req: any): Promise<any[]> {
    return this.emailService.getEmailAccounts(req.user.username);
  }

  @Post()
  async addEmailAccount(
    @Req() req: any,
    @Body() body: EmailAccountDto,
  ): Promise<any> {
    return this.emailService.addEmailAccount(req.user.username, body);
  }

  @Put(':id')
  async updateEmailAccount(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: EmailAccountDto,
  ): Promise<any> {
    return this.emailService.updateEmailAccount(req.user.username, id, body);
  }

  @Delete(':id')
  async deleteEmailAccount(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.emailService.deleteEmailAccount(req.user.username, id);
  }

  // ─────────────────────────── CANNED RESPONSES ───────────────────────────

  @Get('canned-responses')
  async getCannedResponses(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.emailService.getCannedResponses(
      req.user.username,
      pageNum,
      limitNum,
    );
  }

  @Post('canned-responses')
  async createCannedResponse(
    @Req() req: any,
    @Body() body: { name: string; subject?: string; bodyText: string },
  ): Promise<any> {
    return this.emailService.createCannedResponse(req.user.username, body);
  }

  @Put('canned-responses/:id')
  async updateCannedResponse(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { name: string; subject?: string; bodyText: string },
  ): Promise<any> {
    return this.emailService.updateCannedResponse(req.user.username, id, body);
  }

  @Delete('canned-responses/:id')
  async deleteCannedResponse(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.emailService.deleteCannedResponse(req.user.username, id);
  }

  // ─────────────────────────── AUTOCONFIG ───────────────────────────

  @Get('autoconfig/:domain')
  async fetchEmailAutoconfig(
    @Param('domain') domain: string,
  ): Promise<EmailAutoconfigResult> {
    return this.emailService.fetchEmailAutoconfig(domain);
  }

  // ─────────────────────────── ATTACHMENTS ───────────────────────────

  @Get('attachments/:attachmentId')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<StreamableFile> {
    const attach = await this.emailService.getAttachment(attachmentId);
    res.set({
      'Content-Type': attach.contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attach.filename)}"`,
      'Content-Length': attach.size,
    });
    return new StreamableFile(attach.content);
  }

  // ─────────────────────────── ACCOUNT MESSAGES (Singleton) ───────────────────────────

  @Get('unified/folders/:folder/messages')
  async getUnifiedFolderMessages(
    @Req() req: any,
    @Param('folder') folder: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.emailService.getUnifiedFolderMessages(
      req.user.username,
      folder,
      pageNum,
      limitNum,
    );
  }

  @Get(':accountId/folders/:folder/messages')
  async getFolderMessages(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Param('folder') folder: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.emailService.getFolderMessages(
      req.user.username,
      accountId,
      folder,
      pageNum,
      limitNum,
    );
  }

  @Get(':accountId/messages/:messageId')
  async getMessageDetail(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Param('messageId') messageId: string,
  ): Promise<any> {
    return this.emailService.getMessageDetail(
      req.user.username,
      accountId,
      messageId,
    );
  }

  @Put(':accountId/messages/:messageId')
  async updateMessageStatus(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Param('messageId') messageId: string,
    @Body() body: { read?: boolean; flagged?: boolean; folder?: string },
  ): Promise<any> {
    return this.emailService.updateMessageStatus(
      req.user.username,
      accountId,
      messageId,
      body,
    );
  }

  @Delete(':accountId/messages/:messageId')
  async deleteMessage(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Param('messageId') messageId: string,
  ): Promise<{ success: boolean }> {
    return this.emailService.deleteMessage(
      req.user.username,
      accountId,
      messageId,
    );
  }

  @Put(':accountId/messages/bulk')
  async bulkUpdateMessageStatus(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Body()
    body: {
      messageIds: string[];
      read?: boolean;
      flagged?: boolean;
      folder?: string;
    },
  ): Promise<{ success: boolean }> {
    return this.emailService.bulkUpdateMessageStatus(
      req.user.username,
      accountId,
      body.messageIds,
      body,
    );
  }

  @Post(':accountId/messages/bulk-delete')
  async bulkDeleteMessages(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Body() body: { messageIds: string[] },
  ): Promise<{ success: boolean }> {
    return this.emailService.bulkDeleteMessages(
      req.user.username,
      accountId,
      body.messageIds,
    );
  }

  @Post(':accountId/send')
  async sendEmail(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Body() body: SendEmailDto,
  ): Promise<any> {
    return this.emailService.sendEmail(req.user.username, accountId, body);
  }

  @Post(':accountId/sync')
  async syncEmail(
    @Req() req: any,
    @Param('accountId') accountId: string,
  ): Promise<{ success: boolean }> {
    await this.emailSyncService.syncAccount(accountId);
    return { success: true };
  }
}
