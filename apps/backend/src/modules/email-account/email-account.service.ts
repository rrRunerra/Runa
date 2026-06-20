import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { resolveMx } from 'dns/promises';
import * as nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { PrismaService } from '../../providers/database/prisma.service';
import { encrypt, decrypt } from '../../common/utils/crypto';
import { EmailAccountDto } from './dto/email-account.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { NotificationGateway } from '../notification/notification.gateway';

export interface EmailAutoconfigResult {
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
}

function isDomainOrSubdomain(hostname: string, targetDomain: string): boolean {
  const normalized = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
  return normalized === targetDomain || normalized.endsWith('.' + targetDomain);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable()
export class EmailAccountService {
  private readonly logger = new Logger(EmailAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  async getEmailAccounts(username: string): Promise<any[]> {
    const list = await this.prisma.client.userEmailAccount.findMany({
      where: { username },
      orderBy: { createdAt: 'asc' },
    });

    return list.map(account => {
      let decryptedPassword = '';
      try {
        decryptedPassword = decrypt(account.encryptedPassword);
      } catch (e) {
        decryptedPassword = 'Decryption failed';
      }

      return {
        id: account.id,
        accountName: account.accountName,
        color: account.color,
        senderName: account.senderName,
        emailAddress: account.emailAddress,
        loginEmail: account.loginEmail,
        replyToAddress: account.replyToAddress,
        organization: account.organization,
        signatureText: account.signatureText,
        useHtmlSignature: account.useHtmlSignature,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        imapSecure: account.imapSecure,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        smtpSecure: account.smtpSecure,
        password: decryptedPassword,
      };
    });
  }

  async addEmailAccount(username: string, data: EmailAccountDto): Promise<any> {
    const rawPassword = data.password || '';
    const encryptedPassword = encrypt(rawPassword);
    const iv = encryptedPassword.split(':')[0];

    return await this.prisma.client.userEmailAccount.create({
      data: {
        username,
        accountName: data.accountName,
        color: data.color || '#8B00FF',
        senderName: data.senderName,
        emailAddress: data.emailAddress,
        loginEmail: data.loginEmail || null,
        replyToAddress: data.replyToAddress || null,
        organization: data.organization || null,
        signatureText: data.signatureText || null,
        useHtmlSignature: data.useHtmlSignature === true,
        imapHost: data.imapHost,
        imapPort: typeof data.imapPort === 'string' ? parseInt(data.imapPort, 10) : data.imapPort,
        imapSecure: data.imapSecure === true,
        smtpHost: data.smtpHost,
        smtpPort: typeof data.smtpPort === 'string' ? parseInt(data.smtpPort, 10) : data.smtpPort,
        smtpSecure: data.smtpSecure === true,
        encryptedPassword,
        encryptionIv: iv,
      },
    });
  }

  async updateEmailAccount(username: string, accountId: string, data: EmailAccountDto): Promise<any> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) throw new NotFoundException('Email account not found');

    const updateData: any = {
      accountName: data.accountName,
      color: data.color,
      senderName: data.senderName,
      emailAddress: data.emailAddress,
      loginEmail: data.loginEmail || null,
      replyToAddress: data.replyToAddress || null,
      organization: data.organization || null,
      signatureText: data.signatureText || null,
      useHtmlSignature: data.useHtmlSignature === true,
      imapHost: data.imapHost,
      imapPort: typeof data.imapPort === 'string' ? parseInt(data.imapPort, 10) : data.imapPort,
      imapSecure: data.imapSecure === true,
      smtpHost: data.smtpHost,
      smtpPort: typeof data.smtpPort === 'string' ? parseInt(data.smtpPort, 10) : data.smtpPort,
      smtpSecure: data.smtpSecure === true,
    };

    if (data.password) {
      const encrypted = encrypt(data.password);
      updateData.encryptedPassword = encrypted;
      updateData.encryptionIv = encrypted.split(':')[0];
    }

    return await this.prisma.client.userEmailAccount.update({
      where: { id: accountId },
      data: updateData,
    });
  }

  async deleteEmailAccount(username: string, accountId: string): Promise<{ success: boolean }> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) throw new NotFoundException('Email account not found');

    await this.prisma.client.userEmailAccount.delete({
      where: { id: accountId },
    });

    return { success: true };
  }

  async fetchEmailAutoconfig(domain: string): Promise<EmailAutoconfigResult> {
    const normalizedDomain = domain.toLowerCase().trim();

    // Validate domain to prevent SSRF and invalid resolveMx calls
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
    if (!normalizedDomain || normalizedDomain.length > 253 || !domainRegex.test(normalizedDomain)) {
      throw new BadRequestException('Invalid domain name');
    }

    // 1. Thunderbird ISPDB lookup
    try {
      const url = `https://autoconfig.thunderbird.net/v1.1/${normalizedDomain}`;
      const response = await fetch(url);
      if (response.ok) {
        const xmlText = await response.text();

        const imapMatch = xmlText.match(/<incomingServer\s+type="imap"[^>]*>([\s\S]*?)<\/incomingServer>/i);
        const smtpMatch = xmlText.match(/<outgoingServer\s+type="smtp"[^>]*>([\s\S]*?)<\/outgoingServer>/i);

        if (imapMatch && smtpMatch) {
          const extractTag = (block: string, tag: string): string => {
            const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`, 'i'));
            return match ? match[1].trim() : '';
          };

          const imapBlock = imapMatch[1];
          const imapHost = extractTag(imapBlock, 'hostname');
          const imapPortVal = extractTag(imapBlock, 'port');
          const imapSecureType = extractTag(imapBlock, 'socketType');

          const smtpBlock = smtpMatch[1];
          const smtpHost = extractTag(smtpBlock, 'hostname');
          const smtpPortVal = extractTag(smtpBlock, 'port');
          const smtpSecureType = extractTag(smtpBlock, 'socketType');

          if (imapHost && smtpHost) {
            return {
              imapHost,
              imapPort: imapPortVal ? parseInt(imapPortVal, 10) : 993,
              imapSecure: imapSecureType.toUpperCase() === 'SSL',
              smtpHost,
              smtpPort: smtpPortVal ? parseInt(smtpPortVal, 10) : 465,
              smtpSecure: smtpSecureType.toUpperCase() === 'SSL',
            };
          }
        }
      }
    } catch (error) {
      // Fail silently to proceed to DNS/MX fallback
    }

    // 2. DNS MX checks
    try {
      const mxRecords = await resolveMx(normalizedDomain);
      if (mxRecords && mxRecords.length > 0) {
        mxRecords.sort((a, b) => a.priority - b.priority);

        for (const record of mxRecords) {
          const exchange = record.exchange.toLowerCase();

          if (
            isDomainOrSubdomain(exchange, 'google.com') ||
            isDomainOrSubdomain(exchange, 'googlemail.com')
          ) {
            return {
              imapHost: 'imap.gmail.com',
              imapPort: 993,
              imapSecure: true,
              smtpHost: 'smtp.gmail.com',
              smtpPort: 465,
              smtpSecure: true,
            };
          }

          if (
            isDomainOrSubdomain(exchange, 'outlook.com') ||
            isDomainOrSubdomain(exchange, 'mail.protection.outlook.com') ||
            isDomainOrSubdomain(exchange, 'lync.com')
          ) {
            return {
              imapHost: 'outlook.office365.com',
              imapPort: 993,
              imapSecure: true,
              smtpHost: 'smtp-mail.outlook.com',
              smtpPort: 587,
              smtpSecure: false,
            };
          }

          if (isDomainOrSubdomain(exchange, 'purelymail.com')) {
            return {
              imapHost: 'imap.purelymail.com',
              imapPort: 993,
              imapSecure: true,
              smtpHost: 'smtp.purelymail.com',
              smtpPort: 465,
              smtpSecure: true,
            };
          }

          if (
            isDomainOrSubdomain(exchange, 'zoho.com') ||
            isDomainOrSubdomain(exchange, 'zoho.eu')
          ) {
            return {
              imapHost: 'imap.zoho.com',
              imapPort: 993,
              imapSecure: true,
              smtpHost: 'smtp.zoho.com',
              smtpPort: 465,
              smtpSecure: true,
            };
          }
        }
      }
    } catch (dnsError) {
      // Fail silently to explicit checks and generic guess
    }

    // 3. Known domain mappings
    if (normalizedDomain === 'gmail.com') {
      return {
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
      };
    }
    if (normalizedDomain === 'outlook.com' || normalizedDomain === 'hotmail.com' || normalizedDomain.endsWith('.live.com')) {
      return {
        imapHost: 'outlook.office365.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp-mail.outlook.com',
        smtpPort: 587,
        smtpSecure: false,
      };
    }
    if (normalizedDomain === 'yahoo.com') {
      return {
        imapHost: 'imap.mail.yahoo.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.mail.yahoo.com',
        smtpPort: 465,
        smtpSecure: true,
      };
    }
    if (normalizedDomain === 'purelymail.com') {
      return {
        imapHost: 'imap.purelymail.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.purelymail.com',
        smtpPort: 465,
        smtpSecure: true,
      };
    }
    if (normalizedDomain === 'zoho.com') {
      return {
        imapHost: 'imap.zoho.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.zoho.com',
        smtpPort: 465,
        smtpSecure: true,
      };
    }

    // 4. Generic Guess
    return {
      imapHost: `imap.${normalizedDomain}`,
      imapPort: 993,
      imapSecure: true,
      smtpHost: `smtp.${normalizedDomain}`,
      smtpPort: 465,
      smtpSecure: true,
    };
  }

  async getFolderMessages(username: string, accountId: string, folder: string): Promise<any[]> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) throw new NotFoundException('Email account not found');

    return this.prisma.client.emailMessage.findMany({
      where: { userEmailAccountId: accountId, folder: folder.toLowerCase().trim() },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        uid: true,
        messageId: true,
        subject: true,
        from: true,
        to: true,
        cc: true,
        date: true,
        read: true,
        flagged: true,
        folder: true,
        attachments: {
          select: {
            id: true,
            filename: true,
            contentType: true,
            size: true,
          },
        },
      },
    });
  }

  async getMessageDetail(username: string, accountId: string, messageId: string): Promise<any> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) throw new NotFoundException('Email account not found');

    const message = await this.prisma.client.emailMessage.findFirst({
      where: { id: messageId, userEmailAccountId: accountId },
      include: {
        attachments: {
          select: {
            id: true,
            filename: true,
            contentType: true,
            size: true,
          },
        },
      },
    });

    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  async updateMessageStatus(
    username: string,
    accountId: string,
    messageId: string,
    data: { read?: boolean; flagged?: boolean; folder?: string },
  ): Promise<any> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) throw new NotFoundException('Email account not found');

    const message = await this.prisma.client.emailMessage.findFirst({
      where: { id: messageId, userEmailAccountId: accountId },
    });
    if (!message) throw new NotFoundException('Message not found');

    if (data.folder && message.folder !== data.folder) {
      // Avoid unique constraint violation by deleting any pre-existing cached messages in destination folder with the same UID
      await this.prisma.client.emailMessage.deleteMany({
        where: {
          userEmailAccountId: accountId,
          folder: data.folder,
          uid: message.uid,
        },
      });

      // Move remote messages on the IMAP server in the background
      this.moveRemoteMessages(account, [
        { sourceFolder: message.folder, destFolder: data.folder, uids: [message.uid] },
      ]).catch((err) => {
        this.logger.error(`Background remote sync move failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }

    return this.prisma.client.emailMessage.update({
      where: { id: messageId },
      data: {
        read: data.read !== undefined ? data.read : message.read,
        flagged: data.flagged !== undefined ? data.flagged : message.flagged,
        folder: data.folder !== undefined ? data.folder : message.folder,
      },
    });
  }

  async deleteMessage(username: string, accountId: string, messageId: string): Promise<{ success: boolean }> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) throw new NotFoundException('Email account not found');

    const message = await this.prisma.client.emailMessage.findFirst({
      where: { id: messageId, userEmailAccountId: accountId },
    });
    if (!message) throw new NotFoundException('Message not found');

    // Sync remote deletion to IMAP server in the background
    this.deleteRemoteMessages(account, [
      { folder: message.folder, uids: [message.uid] },
    ]).catch((remoteErr) => {
      this.logger.error(`Background remote sync delete failed: ${remoteErr instanceof Error ? remoteErr.message : String(remoteErr)}`);
    });

    if (message.folder === 'trash') {
      await this.prisma.client.emailMessage.delete({
        where: { id: messageId },
      });
    } else {
      // Avoid unique constraint violation by deleting any pre-existing cached messages in trash folder with the same UID
      await this.prisma.client.emailMessage.deleteMany({
        where: {
          userEmailAccountId: accountId,
          folder: 'trash',
          uid: message.uid,
        },
      });

      await this.prisma.client.emailMessage.update({
        where: { id: messageId },
        data: { folder: 'trash' },
      });
    }

    return { success: true };
  }

  async bulkUpdateMessageStatus(
    username: string,
    accountId: string,
    messageIds: string[],
    data: { read?: boolean; flagged?: boolean; folder?: string },
  ): Promise<{ success: boolean }> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) throw new NotFoundException('Email account not found');

    if (data.folder) {
      const messages = await this.prisma.client.emailMessage.findMany({
        where: {
          id: { in: messageIds },
          userEmailAccountId: accountId,
        },
      });

      const messagesToMove = messages.filter((m) => m.folder !== data.folder);

      if (messagesToMove.length > 0) {
        // Avoid unique constraint violation by deleting any pre-existing cached messages in destination folder with the same UIDs
        const uidsToClear = messagesToMove.map((m) => m.uid);
        await this.prisma.client.emailMessage.deleteMany({
          where: {
            userEmailAccountId: accountId,
            folder: data.folder,
            uid: { in: uidsToClear },
          },
        });

        // Group UIDs by current folder
        const groupMap = new Map<string, number[]>();
        for (const m of messagesToMove) {
          const uids = groupMap.get(m.folder) || [];
          uids.push(m.uid);
          groupMap.set(m.folder, uids);
        }

        const moves = Array.from(groupMap.entries()).map(([sourceFolder, uids]) => ({
          sourceFolder,
          destFolder: data.folder!,
          uids,
        }));

        // Move remote messages on the IMAP server in the background
        this.moveRemoteMessages(account, moves).catch((err) => {
          this.logger.error(`Background remote sync bulk move failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      }
    }

    await this.prisma.client.emailMessage.updateMany({
      where: {
        id: { in: messageIds },
        userEmailAccountId: accountId,
      },
      data: {
        ...(data.read !== undefined && { read: data.read }),
        ...(data.flagged !== undefined && { flagged: data.flagged }),
        ...(data.folder !== undefined && { folder: data.folder }),
      },
    });

    return { success: true };
  }

  async bulkDeleteMessages(
    username: string,
    accountId: string,
    messageIds: string[],
  ): Promise<{ success: boolean }> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) throw new NotFoundException('Email account not found');

    const messages = await this.prisma.client.emailMessage.findMany({
      where: {
        id: { in: messageIds },
        userEmailAccountId: accountId,
      },
    });

    if (messages.length === 0) return { success: true };

    // Group message UIDs by folder
    const folderMessagesMap = new Map<string, number[]>();
    for (const msg of messages) {
      const uids = folderMessagesMap.get(msg.folder) || [];
      uids.push(msg.uid);
      folderMessagesMap.set(msg.folder, uids);
    }
    const folderMessages = Array.from(folderMessagesMap.entries()).map(
      ([folder, uids]) => ({ folder, uids }),
    );

    // Sync remote deletion to IMAP server in the background
    this.deleteRemoteMessages(account, folderMessages).catch((remoteErr) => {
      this.logger.error(`Background remote sync bulk delete failed: ${remoteErr instanceof Error ? remoteErr.message : String(remoteErr)}`);
    });

    const trashMessages = messages.filter((m) => m.folder === 'trash');
    const nonTrashMessages = messages.filter((m) => m.folder !== 'trash');

    if (trashMessages.length > 0) {
      await this.prisma.client.emailMessage.deleteMany({
        where: {
          id: { in: trashMessages.map((m) => m.id) },
        },
      });
    }

    if (nonTrashMessages.length > 0) {
      const uidsToClear = nonTrashMessages.map((m) => m.uid);
      await this.prisma.client.emailMessage.deleteMany({
        where: {
          userEmailAccountId: accountId,
          folder: 'trash',
          uid: { in: uidsToClear },
        },
      });

      await this.prisma.client.emailMessage.updateMany({
        where: {
          id: { in: nonTrashMessages.map((m) => m.id) },
        },
        data: { folder: 'trash' },
      });
    }

    return { success: true };
  }

  private async deleteRemoteMessages(
    account: any,
    folderMessages: { folder: string; uids: number[] }[],
  ): Promise<void> {
    const decryptedPassword = decrypt(account.encryptedPassword);
    const authUser = account.loginEmail || account.emailAddress;
    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSecure,
      auth: {
        user: authUser,
        pass: decryptedPassword,
      },
      logger: false,
    });

    try {
      await client.connect();
      const folders = await client.list();

      // Map standard folder names (e.g. 'inbox', 'trash') to remote mailbox paths
      const remoteFolderMap = new Map<string, string>();
      for (const f of folders) {
        const stdName = this.getStandardFolderName(f);
        remoteFolderMap.set(stdName, f.path);
      }

      const trashPath = remoteFolderMap.get('trash') || 'Trash';

      for (const { folder, uids } of folderMessages) {
        const remotePath = remoteFolderMap.get(folder);
        if (!remotePath) {
          this.logger.warn(`Remote path not found for local folder: ${folder}`);
          continue;
        }

        const lock = await client.getMailboxLock(remotePath);
        try {
          const uidRange = uids.join(',');

          if (folder === 'trash') {
            // Permanently delete on remote
            this.logger.log(`Permanently deleting UIDs [${uidRange}] in remote folder: ${remotePath}`);
            await client.messageDelete(uidRange, { uid: true });
          } else {
            // Move to remote trash folder
            this.logger.log(`Moving UIDs [${uidRange}] from remote folder: ${remotePath} to trash folder: ${trashPath}`);
            await client.messageMove(uidRange, trashPath, { uid: true });
          }
        } catch (opErr) {
          this.logger.error(`Error deleting/moving remote UIDs for folder ${remotePath}:`, opErr);
        } finally {
          lock.release();
        }
      }
    } catch (connErr) {
      this.logger.error(`Failed to connect to IMAP for remote deletion sync on account ${account.emailAddress}:`, connErr);
    } finally {
      try {
        await client.logout();
      } catch (err) {
        // Silent logout
      }
    }
  }

  private getStandardFolderName(folder: any): string {
    const special = folder.specialUse ? folder.specialUse.toLowerCase() : '';
    const path = folder.path.toLowerCase();

    if (special === '\\inbox' || path === 'inbox') return 'inbox';
    if (special === '\\sent' || path.includes('sent')) return 'sent';
    if (special === '\\drafts' || path.includes('draft') || path.includes('drafts')) return 'drafts';
    if (special === '\\trash' || path.includes('trash') || path.includes('deleted')) return 'trash';
    if (special === '\\junk' || path.includes('junk') || path.includes('spam')) return 'junk';
    if (special === '\\archive' || path.includes('archive')) return 'archive';

    return path;
  }

  private async moveRemoteMessages(
    account: any,
    moves: { sourceFolder: string; destFolder: string; uids: number[] }[],
  ): Promise<void> {
    const decryptedPassword = decrypt(account.encryptedPassword);
    const authUser = account.loginEmail || account.emailAddress;
    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSecure,
      auth: {
        user: authUser,
        pass: decryptedPassword,
      },
      logger: false,
    });

    try {
      await client.connect();
      const folders = await client.list();

      const remoteFolderMap = new Map<string, string>();
      for (const f of folders) {
        const stdName = this.getStandardFolderName(f);
        remoteFolderMap.set(stdName, f.path);
      }

      for (const { sourceFolder, destFolder, uids } of moves) {
        const remoteSourcePath = remoteFolderMap.get(sourceFolder);
        const remoteDestPath = remoteFolderMap.get(destFolder) || 'INBOX';

        if (!remoteSourcePath) {
          this.logger.warn(`Remote source path not found for local folder: ${sourceFolder}`);
          continue;
        }

        const lock = await client.getMailboxLock(remoteSourcePath);
        try {
          const uidRange = uids.join(',');
          this.logger.log(`Moving remote UIDs [${uidRange}] from ${remoteSourcePath} to ${remoteDestPath}`);
          await client.messageMove(uidRange, remoteDestPath, { uid: true });
        } catch (opErr) {
          this.logger.error(`Error moving remote UIDs from ${remoteSourcePath} to ${remoteDestPath}:`, opErr);
        } finally {
          lock.release();
        }
      }
    } catch (connErr) {
      this.logger.error(`Failed to connect to IMAP for remote move sync on account ${account.emailAddress}:`, connErr);
    } finally {
      try {
        await client.logout();
      } catch (err) {
        // Silent logout
      }
    }
  }

  async sendEmail(username: string, accountId: string, data: SendEmailDto): Promise<any> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) {
      throw new NotFoundException('Email account not found');
    }

    const decryptedPassword = decrypt(account.encryptedPassword);

    const authUser = account.loginEmail || account.emailAddress;
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpSecure,
      auth: {
        user: authUser,
        pass: decryptedPassword,
      },
    });

    const from = account.senderName
      ? `"${account.senderName}" <${account.emailAddress}>`
      : account.emailAddress;

    const escapedBodyHtml = escapeHtml(data.body).replace(/\n/g, '<br />');

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to: data.to,
      cc: data.cc || undefined,
      subject: data.subject,
      text: data.body,
      html: escapedBodyHtml,
    };

    let info: nodemailer.SentMessageInfo;
    try {
      info = await transporter.sendMail(mailOptions);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send email via SMTP: ${message}`);
    }

    // Determine the next local UID for the sent folder
    const lastSentMessage = await this.prisma.client.emailMessage.findFirst({
      where: {
        userEmailAccountId: accountId,
        folder: 'sent',
      },
      orderBy: { uid: 'desc' },
    });
    const nextUid = lastSentMessage ? lastSentMessage.uid + 1 : 1;

    // Create the message in database
    const savedMessage = await this.prisma.client.emailMessage.create({
      data: {
        userEmailAccountId: accountId,
        uid: nextUid,
        messageId: info.messageId || null,
        subject: data.subject,
        from,
        to: data.to,
        cc: data.cc || null,
        date: new Date(),
        bodyText: data.body,
        bodyHtml: escapedBodyHtml,
        read: true,
        folder: 'sent',
      },
    });

    try {
      const user = await this.prisma.client.user.findUnique({
        where: { username },
      });
      if (user) {
        this.gateway.sendToUser(user.id, 'email:new', {
          accountId,
          folder: 'sent',
          message: savedMessage,
        });
      }
    } catch (wsErr) {
      // Fail silently on WS broadcasting issues
    }

    return savedMessage;
  }

  async getAttachment(attachmentId: string): Promise<any> {
    const attachment = await this.prisma.client.emailAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }
}
