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
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { EmailAccountService, EmailAutoconfigResult } from './email-account.service';
import { EmailSyncService } from './email-sync.service';
import { EmailAccountDto } from './dto/email-account.dto';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('/emails')
@UseGuards(DualAuthGuard)
export class EmailAccountController {
  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly emailSyncService: EmailSyncService,
  ) {}

  @Get()
  async getEmailAccounts(@Req() req: any): Promise<any[]> {
    return this.emailAccountService.getEmailAccounts(req.user.username);
  }

  @Post()
  async addEmailAccount(@Req() req: any, @Body() body: EmailAccountDto): Promise<any> {
    return this.emailAccountService.addEmailAccount(req.user.username, body);
  }

  @Put(':id')
  async updateEmailAccount(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: EmailAccountDto,
  ): Promise<any> {
    return this.emailAccountService.updateEmailAccount(req.user.username, id, body);
  }

  @Delete(':id')
  async deleteEmailAccount(@Req() req: any, @Param('id') id: string): Promise<{ success: boolean }> {
    return this.emailAccountService.deleteEmailAccount(req.user.username, id);
  }

  @Get('canned-responses')
  async getCannedResponses(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.emailAccountService.getCannedResponses(req.user.username, pageNum, limitNum);
  }

  @Post('canned-responses')
  async createCannedResponse(
    @Req() req: any,
    @Body() body: { name: string; subject?: string; bodyText: string },
  ): Promise<any> {
    return this.emailAccountService.createCannedResponse(req.user.username, body);
  }

  @Put('canned-responses/:id')
  async updateCannedResponse(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { name: string; subject?: string; bodyText: string },
  ): Promise<any> {
    return this.emailAccountService.updateCannedResponse(req.user.username, id, body);
  }

  @Delete('canned-responses/:id')
  async deleteCannedResponse(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    return this.emailAccountService.deleteCannedResponse(req.user.username, id);
  }

  @Get('autoconfig/:domain')
  async fetchEmailAutoconfig(@Param('domain') domain: string): Promise<EmailAutoconfigResult> {
    return this.emailAccountService.fetchEmailAutoconfig(domain);
  }

  // --- Linked Folder & Message Queries ---

  @Get('unified/folders/:folder/messages')
  async getUnifiedFolderMessages(
    @Req() req: any,
    @Param('folder') folder: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any[]> {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.emailAccountService.getUnifiedFolderMessages(req.user.username, folder, pageNum, limitNum);
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
    return this.emailAccountService.getFolderMessages(req.user.username, accountId, folder, pageNum, limitNum);
  }

  @Get(':accountId/messages/:messageId')
  async getMessageDetail(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Param('messageId') messageId: string,
  ): Promise<any> {
    return this.emailAccountService.getMessageDetail(req.user.username, accountId, messageId);
  }

  @Put(':accountId/messages/:messageId')
  async updateMessageStatus(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Param('messageId') messageId: string,
    @Body() body: { read?: boolean; flagged?: boolean; folder?: string },
  ): Promise<any> {
    return this.emailAccountService.updateMessageStatus(
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
    return this.emailAccountService.deleteMessage(req.user.username, accountId, messageId);
  }

  @Put(':accountId/messages/bulk')
  async bulkUpdateMessageStatus(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Body() body: { messageIds: string[]; read?: boolean; flagged?: boolean; folder?: string },
  ): Promise<{ success: boolean }> {
    return this.emailAccountService.bulkUpdateMessageStatus(
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
    return this.emailAccountService.bulkDeleteMessages(
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
    return this.emailAccountService.sendEmail(req.user.username, accountId, body);
  }

  @Post(':accountId/sync')
  async syncEmail(
    @Req() req: any,
    @Param('accountId') accountId: string,
  ): Promise<{ success: boolean }> {
    await this.emailSyncService.syncAccount(accountId);
    return { success: true };
  }

  @Get('attachments/:attachmentId')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<StreamableFile> {
    const attach = await this.emailAccountService.getAttachment(attachmentId);
    res.set({
      'Content-Type': attach.contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attach.filename)}"`,
      'Content-Length': attach.size,
    });
    return new StreamableFile(attach.content);
  }
}
