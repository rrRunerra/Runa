import { Injectable, Logger } from '@nestjs/common';
import {
  rrBadRequestException,
  rrNotFoundException,
  rrInternalServerErrorException,
} from 'src/providers/error';
import { resolveMx } from 'dns/promises';
import * as nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { PrismaService } from '../../providers/database/prisma.service';
import { CacheService } from '../../providers/cache/cache.service';
import { encrypt as encryptServer, decrypt } from '@runa/crypto/server';
import { generateDataKey, encrypt, wrapKey } from '@runa/crypto/node';
import { EmailAccountDto, SendEmailDto, SaveDraftDto, TestEmailConnectionDto } from './email.dto';
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

/**
 * Extracts IMAP/SMTP config from Thunderbird ISPDB XML response text.
 * Returns null if required data is not found.
 */
function parseThunderbirdXml(xmlText: string): EmailAutoconfigResult | null {
  const imapMatch = xmlText.match(
    /<incomingServer\s+type="imap"[^>]*>([\s\S]*?)<\/incomingServer>/i,
  );
  const smtpMatch = xmlText.match(
    /<outgoingServer\s+type="smtp"[^>]*>([\s\S]*?)<\/outgoingServer>/i,
  );

  if (!imapMatch || !smtpMatch) return null;

  const extractTag = (block: string, tag: string): string => {
    const match = block.match(
      new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'),
    );
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

  if (!imapHost || !smtpHost) return null;

  return {
    imapHost,
    imapPort: imapPortVal ? parseInt(imapPortVal, 10) : 993,
    imapSecure:
      imapSecureType.toUpperCase() === 'SSL' ||
      imapSecureType.toUpperCase() === 'SSL/TLS',
    smtpHost,
    smtpPort: smtpPortVal ? parseInt(smtpPortVal, 10) : 465,
    smtpSecure:
      smtpSecureType.toUpperCase() === 'SSL' ||
      smtpSecureType.toUpperCase() === 'SSL/TLS',
  };
}

/** Fetches and parses Thunderbird ISPDB autoconfig for a domain. Returns null on failure. */
async function fetchThunderbirdConfig(
  domain: string,
): Promise<EmailAutoconfigResult | null> {
  try {
    const url = `https://autoconfig.thunderbird.net/v1.1/${domain}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const xmlText = await response.text();
    return parseThunderbirdXml(xmlText);
  } catch {
    return null;
  }
}

@Injectable()
export class EmailService {
  private readonly moduleCode = 'ElSve-';
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly gateway: NotificationGateway,
  ) {}

  async getEmailAccounts(username: string): Promise<any[]> {
    const list = await this.prisma.client.userEmailAccount.findMany({
      where: { username },
      include: {
        emailMessages: {
          where: {
            read: false,
            folder: 'inbox',
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return list.map((account) => {
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
        syncEnabled: account.syncEnabled,
        syncTimeRangeEnabled: account.syncTimeRangeEnabled,
        syncStartTime: account.syncStartTime,
        syncEndTime: account.syncEndTime,
        syncDays: account.syncDays,
        syncTimezone: account.syncTimezone,
        syncIntervalMinutes: account.syncIntervalMinutes,
        unreadCount: (account as any).emailMessages?.length || 0,
      };
    });
  }

  async addEmailAccount(username: string, data: EmailAccountDto): Promise<any> {
    const rawPassword = data.password || '';
    const encryptedPassword = encryptServer(rawPassword);
    const iv = encryptedPassword.split(':')[0];

    const account = await this.prisma.client.userEmailAccount.create({
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
        imapPort:
          typeof data.imapPort === 'string'
            ? parseInt(data.imapPort, 10)
            : data.imapPort,
        imapSecure: data.imapSecure === true,
        smtpHost: data.smtpHost,
        smtpPort:
          typeof data.smtpPort === 'string'
            ? parseInt(data.smtpPort, 10)
            : data.smtpPort,
        smtpSecure: data.smtpSecure === true,
        syncEnabled: data.syncEnabled !== false,
        syncTimeRangeEnabled: data.syncTimeRangeEnabled === true,
        syncStartTime: data.syncStartTime || '08:00',
        syncEndTime: data.syncEndTime || '22:00',
        syncDays: data.syncDays || [0, 1, 2, 3, 4, 5, 6],
        syncTimezone: data.syncTimezone || 'UTC',
        syncIntervalMinutes: data.syncIntervalMinutes || 5,
        encryptedPassword,
        encryptionIv: iv,
      },
    });

    const { encryptedPassword: _, encryptionIv: __, ...safeAccount } = account;
    return safeAccount;
  }

  async updateEmailAccount(
    username: string,
    accountId: string,
    data: EmailAccountDto,
  ): Promise<any> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account)
      throw new rrNotFoundException(`${this.moduleCode}EANF001`, {
        message: 'Email account not found',
      });

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
      imapPort:
        typeof data.imapPort === 'string'
          ? parseInt(data.imapPort, 10)
          : data.imapPort,
      imapSecure: data.imapSecure === true,
      smtpHost: data.smtpHost,
      smtpPort:
        typeof data.smtpPort === 'string'
          ? parseInt(data.smtpPort, 10)
          : data.smtpPort,
      smtpSecure: data.smtpSecure === true,
      ...(data.syncEnabled !== undefined && {
        syncEnabled: data.syncEnabled,
      }),
      ...(data.syncTimeRangeEnabled !== undefined && {
        syncTimeRangeEnabled: data.syncTimeRangeEnabled,
      }),
      ...(data.syncStartTime !== undefined && {
        syncStartTime: data.syncStartTime,
      }),
      ...(data.syncEndTime !== undefined && {
        syncEndTime: data.syncEndTime,
      }),
      ...(data.syncDays !== undefined && {
        syncDays: data.syncDays,
      }),
      ...(data.syncTimezone !== undefined && {
        syncTimezone: data.syncTimezone,
      }),
      ...(data.syncIntervalMinutes !== undefined && {
        syncIntervalMinutes: data.syncIntervalMinutes,
      }),
    };

    if (data.password) {
      const encrypted = encryptServer(data.password);
      updateData.encryptedPassword = encrypted;
      updateData.encryptionIv = encrypted.split(':')[0];
    }

    const updated = await this.prisma.client.userEmailAccount.update({
      where: { id: accountId },
      data: updateData,
    });

    const { encryptedPassword: _, encryptionIv: __, ...safeAccount } = updated;
    return safeAccount;
  }

  async deleteEmailAccount(
    username: string,
    accountId: string,
  ): Promise<{ success: boolean }> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account)
      throw new rrNotFoundException(`${this.moduleCode}EANF002`, {
        message: 'Email account not found',
      });

    await this.prisma.client.userEmailAccount.delete({
      where: { id: accountId },
    });

    return { success: true };
  }

  async fetchEmailAutoconfig(domain: string): Promise<EmailAutoconfigResult> {
    const normalizedDomain = domain.toLowerCase().trim();

    // Validate domain to prevent SSRF and invalid resolveMx calls
    const domainRegex =
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
    if (
      !normalizedDomain ||
      normalizedDomain.length > 253 ||
      !domainRegex.test(normalizedDomain)
    ) {
      throw new rrBadRequestException(`${this.moduleCode}IDN001`, {
        message: 'Invalid domain name',
      });
    }

    // Check cache first
    const cacheKey = CacheService.keys.emailAutoconfig(normalizedDomain);
    const cached = await this.cache.get<EmailAutoconfigResult>(cacheKey);
    if (cached) return cached;

    // 1. Thunderbird ISPDB lookup for the domain directly
    const directConfig = await fetchThunderbirdConfig(normalizedDomain);
    if (directConfig) {
      await this.cache.set(cacheKey, directConfig, 86400); // 24h TTL
      return directConfig;
    }

    // 2. DNS MX records - check known providers first, then fall back to ISPDB lookup for the MX host domain
    try {
      const mxRecords = await resolveMx(normalizedDomain);
      if (mxRecords && mxRecords.length > 0) {
        mxRecords.sort((a, b) => a.priority - b.priority);

        for (const record of mxRecords) {
          const exchange = record.exchange.toLowerCase().replace(/\.$/, '');

          // Known provider fast-paths
          if (
            isDomainOrSubdomain(exchange, 'google.com') ||
            isDomainOrSubdomain(exchange, 'googlemail.com')
          ) {
            const result: EmailAutoconfigResult = {
              imapHost: 'imap.gmail.com',
              imapPort: 993,
              imapSecure: true,
              smtpHost: 'smtp.gmail.com',
              smtpPort: 465,
              smtpSecure: true,
            };
            await this.cache.set(cacheKey, result, 86400);
            return result;
          }

          if (
            isDomainOrSubdomain(exchange, 'outlook.com') ||
            isDomainOrSubdomain(exchange, 'mail.protection.outlook.com') ||
            isDomainOrSubdomain(exchange, 'lync.com')
          ) {
            const result: EmailAutoconfigResult = {
              imapHost: 'outlook.office365.com',
              imapPort: 993,
              imapSecure: true,
              smtpHost: 'smtp-mail.outlook.com',
              smtpPort: 587,
              smtpSecure: false,
            };
            await this.cache.set(cacheKey, result, 86400);
            return result;
          }

          // For all other MX hosts: extract the base domain and query Thunderbird ISPDB
          // e.g. "mailserver.purelymail.com" → "purelymail.com"
          const parts = exchange.split('.');
          if (parts.length >= 2) {
            const mxBaseDomain = parts.slice(-2).join('.');
            if (mxBaseDomain !== normalizedDomain) {
              const mxConfig = await fetchThunderbirdConfig(mxBaseDomain);
              if (mxConfig) {
                await this.cache.set(cacheKey, mxConfig, 86400);
                return mxConfig;
              }
            }
          }
        }
      }
    } catch (dnsError) {
      // Fail silently to known domain list and generic guess
    }

    // 3. Known domain mappings
    if (normalizedDomain === 'gmail.com') {
      const result: EmailAutoconfigResult = {
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
      };
      await this.cache.set(cacheKey, result, 86400);
      return result;
    }
    if (
      normalizedDomain === 'outlook.com' ||
      normalizedDomain === 'hotmail.com' ||
      normalizedDomain.endsWith('.live.com')
    ) {
      const result: EmailAutoconfigResult = {
        imapHost: 'outlook.office365.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp-mail.outlook.com',
        smtpPort: 587,
        smtpSecure: false,
      };
      await this.cache.set(cacheKey, result, 86400);
      return result;
    }
    if (normalizedDomain === 'yahoo.com') {
      const result: EmailAutoconfigResult = {
        imapHost: 'imap.mail.yahoo.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.mail.yahoo.com',
        smtpPort: 465,
        smtpSecure: true,
      };
      await this.cache.set(cacheKey, result, 86400);
      return result;
    }
    if (normalizedDomain === 'purelymail.com') {
      const result: EmailAutoconfigResult = {
        imapHost: 'imap.purelymail.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.purelymail.com',
        smtpPort: 465,
        smtpSecure: true,
      };
      await this.cache.set(cacheKey, result, 86400);
      return result;
    }
    if (normalizedDomain === 'zoho.com') {
      const result: EmailAutoconfigResult = {
        imapHost: 'imap.zoho.com',
        imapPort: 993,
        imapSecure: true,
        smtpHost: 'smtp.zoho.com',
        smtpPort: 465,
        smtpSecure: true,
      };
      await this.cache.set(cacheKey, result, 86400);
      return result;
    }

    // 4. Generic Guess
    const result: EmailAutoconfigResult = {
      imapHost: `imap.${normalizedDomain}`,
      imapPort: 993,
      imapSecure: true,
      smtpHost: `smtp.${normalizedDomain}`,
      smtpPort: 465,
      smtpSecure: true,
    };
    return result;
  }

  async getFolderMessages(
    username: string,
    accountId: string,
    folder: string,
    page?: number,
    limit?: number,
  ): Promise<any[]> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account)
      throw new rrNotFoundException(`${this.moduleCode}EANF003`, {
        message: 'Email account not found',
      });

    const take = limit ? Number(limit) : 50;
    const skip = page ? (Number(page) - 1) * take : 0;

    return this.prisma.client.emailMessage.findMany({
      where: {
        userEmailAccountId: accountId,
        folder: folder.toLowerCase().trim(),
      },
      orderBy: { date: 'desc' },
      take,
      skip,
      select: {
        id: true,
        uid: true,
        messageId: true,
        subject: true,
        from: true,
        to: true,
        cc: true,
        bcc: true,
        date: true,
        read: true,
        flagged: true,
        folder: true,
        encryptedKey: true,
        labels: true,
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

  async getMessageDetail(
    username: string,
    accountId: string,
    messageId: string,
  ): Promise<any> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account)
      throw new rrNotFoundException(`${this.moduleCode}EANF004`, {
        message: 'Email account not found',
      });

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

    if (!message)
      throw new rrNotFoundException(`${this.moduleCode}MNF001`, {
        message: 'Message not found',
      });
    return message;
  }

  async updateMessageStatus(
    username: string,
    accountId: string,
    messageId: string,
    data: {
      read?: boolean;
      flagged?: boolean;
      folder?: string;
      labels?: string[];
    },
  ): Promise<any> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account)
      throw new rrNotFoundException(`${this.moduleCode}EANF005`, {
        message: 'Email account not found',
      });

    const message = await this.prisma.client.emailMessage.findFirst({
      where: { id: messageId, userEmailAccountId: accountId },
    });
    if (!message)
      throw new rrNotFoundException(`${this.moduleCode}MNF002`, {
        message: 'Message not found',
      });

    let targetUid = message.uid;
    if (data.folder && message.folder !== data.folder) {
      const existingInDest = await this.prisma.client.emailMessage.findFirst({
        where: {
          userEmailAccountId: accountId,
          folder: data.folder,
          uid: message.uid,
          id: { not: messageId },
        },
      });
      if (existingInDest) {
        targetUid = Math.floor(10000000 + Math.random() * 89999999);
      }

      // Move remote messages on the IMAP server in the background
      this.moveRemoteMessages(account, [
        {
          sourceFolder: message.folder,
          destFolder: data.folder,
          uids: [message.uid],
        },
      ]).catch((err) => {
        this.logger.error(
          `Background remote sync move failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    return this.prisma.client.emailMessage.update({
      where: { id: messageId },
      data: {
        read: data.read !== undefined ? data.read : message.read,
        flagged: data.flagged !== undefined ? data.flagged : message.flagged,
        folder: data.folder !== undefined ? data.folder : message.folder,
        uid: targetUid,
        labels: data.labels !== undefined ? data.labels : message.labels,
      },
    });
  }

  async copyMessage(
    username: string,
    accountId: string,
    messageId: string,
    targetFolder: string,
  ): Promise<any> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account)
      throw new rrNotFoundException(`${this.moduleCode}EANF006`, {
        message: 'Email account not found',
      });

    const message = await this.prisma.client.emailMessage.findFirst({
      where: { id: messageId, userEmailAccountId: accountId },
      include: { attachments: true },
    });
    if (!message)
      throw new rrNotFoundException(`${this.moduleCode}MNF003`, {
        message: 'Message not found',
      });

    const newUid = Math.floor(10000000 + Math.random() * 89999999);

    const copied = await this.prisma.client.emailMessage.create({
      data: {
        uid: newUid,
        messageId: message.messageId
          ? `${message.messageId}-copy-${Date.now()}`
          : null,
        subject: message.subject,
        from: message.from,
        to: message.to,
        cc: message.cc,
        date: message.date,
        read: message.read,
        flagged: message.flagged,
        folder: targetFolder.toLowerCase(),
        bodyText: message.bodyText,
        bodyHtml: message.bodyHtml,
        encryptedKey:
          message.encryptedKey !== null
            ? (message.encryptedKey as any)
            : undefined,
        userEmailAccountId: accountId,
        attachments: {
          create: (message.attachments || []).map((att) => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            content: att.content,
          })),
        },
      },
    });

    return copied;
  }

  async deleteMessage(
    username: string,
    accountId: string,
    messageId: string,
  ): Promise<{ success: boolean }> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account)
      throw new rrNotFoundException(`${this.moduleCode}EANF006`, {
        message: 'Email account not found',
      });

    const message = await this.prisma.client.emailMessage.findFirst({
      where: { id: messageId, userEmailAccountId: accountId },
    });
    if (!message)
      throw new rrNotFoundException(`${this.moduleCode}MNF003`, {
        message: 'Message not found',
      });

    // Sync remote deletion to IMAP server in the background
    this.deleteRemoteMessages(account, [
      { folder: message.folder, uids: [message.uid] },
    ]).catch((remoteErr) => {
      this.logger.error(
        `Background remote sync delete failed: ${remoteErr instanceof Error ? remoteErr.message : String(remoteErr)}`,
      );
    });

    if (message.folder === 'trash') {
      await this.prisma.client.emailMessage.delete({
        where: { id: messageId },
      });
    } else {
      const existingInTrash =
        await this.prisma.client.emailMessage.findFirst({
          where: {
            userEmailAccountId: accountId,
            folder: 'trash',
            uid: message.uid,
            id: { not: messageId },
          },
        });

      const newUid = existingInTrash
        ? Math.floor(10000000 + Math.random() * 89999999)
        : message.uid;

      await this.prisma.client.emailMessage.update({
        where: { id: messageId },
        data: { folder: 'trash', uid: newUid },
      });
    }

    return { success: true };
  }

  async bulkUpdateMessageStatus(
    username: string,
    accountId: string,
    messageIds: string[],
    data: {
      read?: boolean;
      flagged?: boolean;
      folder?: string;
      labels?: string[];
    },
  ): Promise<{ success: boolean }> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account)
      throw new rrNotFoundException(`${this.moduleCode}EANF007`, {
        message: 'Email account not found',
      });

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

        const moves = Array.from(groupMap.entries()).map(
          ([sourceFolder, uids]) => ({
            sourceFolder,
            destFolder: data.folder!,
            uids,
          }),
        );

        // Move remote messages on the IMAP server in the background
        this.moveRemoteMessages(account, moves).catch((err) => {
          this.logger.error(
            `Background remote sync bulk move failed: ${err instanceof Error ? err.message : String(err)}`,
          );
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
        ...(data.labels !== undefined && { labels: data.labels }),
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
    if (!account)
      throw new rrNotFoundException(`${this.moduleCode}EANF008`, {
        message: 'Email account not found',
      });

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
      this.logger.error(
        `Background remote sync bulk delete failed: ${remoteErr instanceof Error ? remoteErr.message : String(remoteErr)}`,
      );
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

  async emptyTrash(
    username: string,
    accountId: string,
  ): Promise<{ success: boolean }> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account)
      throw new rrNotFoundException(`${this.moduleCode}EANF009`, {
        message: 'Email account not found',
      });

    const messages = await this.prisma.client.emailMessage.findMany({
      where: {
        userEmailAccountId: accountId,
        folder: 'trash',
      },
    });

    if (messages.length === 0) return { success: true };

    const uids = messages.map((m) => m.uid);

    // Sync remote deletion to IMAP server in the background
    this.deleteRemoteMessages(account, [{ folder: 'trash', uids }]).catch(
      (remoteErr) => {
        this.logger.error(
          `Background remote sync empty trash failed: ${remoteErr instanceof Error ? remoteErr.message : String(remoteErr)}`,
        );
      },
    );

    await this.prisma.client.emailMessage.deleteMany({
      where: {
        userEmailAccountId: accountId,
        folder: 'trash',
      },
    });

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
            this.logger.log(
              `Permanently deleting UIDs [${uidRange}] in remote folder: ${remotePath}`,
            );
            await client.messageDelete(uidRange, { uid: true });
          } else {
            // Move to remote trash folder
            this.logger.log(
              `Moving UIDs [${uidRange}] from remote folder: ${remotePath} to trash folder: ${trashPath}`,
            );
            await client.messageMove(uidRange, trashPath, { uid: true });
          }
        } catch (opErr) {
          this.logger.error(
            `Error deleting/moving remote UIDs for folder ${remotePath}:`,
            opErr,
          );
        } finally {
          lock.release();
        }
      }
    } catch (connErr) {
      this.logger.error(
        `Failed to connect to IMAP for remote deletion sync on account ${account.emailAddress}:`,
        connErr,
      );
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
    if (
      special === '\\drafts' ||
      path.includes('draft') ||
      path.includes('drafts')
    )
      return 'drafts';
    if (
      special === '\\trash' ||
      path.includes('trash') ||
      path.includes('deleted')
    )
      return 'trash';
    if (special === '\\junk' || path.includes('junk') || path.includes('spam'))
      return 'junk';
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
          this.logger.warn(
            `Remote source path not found for local folder: ${sourceFolder}`,
          );
          continue;
        }

        const lock = await client.getMailboxLock(remoteSourcePath);
        try {
          const uidRange = uids.join(',');
          this.logger.log(
            `Moving remote UIDs [${uidRange}] from ${remoteSourcePath} to ${remoteDestPath}`,
          );
          await client.messageMove(uidRange, remoteDestPath, { uid: true });
        } catch (opErr) {
          this.logger.error(
            `Error moving remote UIDs from ${remoteSourcePath} to ${remoteDestPath}:`,
            opErr,
          );
        } finally {
          lock.release();
        }
      }
    } catch (connErr) {
      this.logger.error(
        `Failed to connect to IMAP for remote move sync on account ${account.emailAddress}:`,
        connErr,
      );
    } finally {
      try {
        await client.logout();
      } catch (err) {
        // Silent logout
      }
    }
  }

  async sendEmail(
    username: string,
    accountId: string,
    data: SendEmailDto,
  ): Promise<any> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) {
      throw new rrNotFoundException(`${this.moduleCode}EANF009`, {
        message: 'Email account not found',
      });
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

    const escapedBodyHtml =
      data.html || escapeHtml(data.body).replace(/\n/g, '<br />');

    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to: data.to,
      cc: data.cc || undefined,
      bcc: data.bcc || undefined,
      subject: data.subject,
      text: data.body,
      html: escapedBodyHtml,
    };

    let info: nodemailer.SentMessageInfo;
    try {
      info = await transporter.sendMail(mailOptions);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new rrInternalServerErrorException(`${this.moduleCode}FTSEVS001`, {
        message: `Failed to send email via SMTP: ${message}`,
      });
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

    const userRecord = await this.prisma.client.user.findUnique({
      where: { username },
      select: { id: true, userPublicKey: true, userMlKemPublicKey: true },
    });

    let subject = data.subject || '';
    let bodyText = data.body || '';
    let bodyHtml = escapedBodyHtml || '';
    let toVal = data.to || '';
    let fromVal = from || '';
    let ccVal = data.cc || null;
    let bccVal = data.bcc || null;
    let encryptedKey = null;

    if (userRecord && userRecord.userPublicKey) {
      try {
        const dataKey = generateDataKey();
        subject = encrypt(subject, dataKey);
        bodyText = encrypt(bodyText, dataKey);
        bodyHtml = encrypt(bodyHtml, dataKey);

        if (toVal) toVal = encrypt(toVal, dataKey);
        if (fromVal) fromVal = encrypt(fromVal, dataKey);
        if (ccVal) ccVal = encrypt(ccVal, dataKey);
        if (bccVal) bccVal = encrypt(bccVal, dataKey);

        encryptedKey = (await wrapKey(
          dataKey,
          userRecord.userPublicKey,
          userRecord.userMlKemPublicKey,
        )) as any;
      } catch (encErr) {
        this.logger.error(`E2EE encryption failed for sent email:`, encErr);
      }
    }

    // Create the message in database
    const savedMessage = await this.prisma.client.emailMessage.create({
      data: {
        userEmailAccountId: accountId,
        uid: nextUid,
        messageId: info.messageId || null,
        subject,
        from: fromVal,
        to: toVal,
        cc: ccVal || null,
        bcc: bccVal || null,
        date: new Date(),
        bodyText,
        bodyHtml,
        read: true,
        folder: 'sent',
        encryptedKey: encryptedKey || undefined,
      },
    });

    try {
      if (userRecord) {
        this.gateway.sendToUser(userRecord.id, 'email:new', {
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

  async saveDraft(
    username: string,
    accountId: string,
    data: SaveDraftDto,
  ): Promise<any> {
    const account = await this.prisma.client.userEmailAccount.findFirst({
      where: { id: accountId, username },
    });
    if (!account) {
      throw new rrNotFoundException(`${this.moduleCode}EANF010`, {
        message: 'Email account not found',
      });
    }

    const from = account.senderName
      ? `"${account.senderName}" <${account.emailAddress}>`
      : account.emailAddress;

    const escapedBodyHtml =
      data.html ||
      (data.body ? escapeHtml(data.body).replace(/\n/g, '<br />') : '');

    // Determine the next local UID for the drafts folder
    const lastDraftMessage = await this.prisma.client.emailMessage.findFirst({
      where: {
        userEmailAccountId: accountId,
        folder: 'drafts',
      },
      orderBy: { uid: 'desc' },
    });
    const nextUid = lastDraftMessage ? lastDraftMessage.uid + 1 : 1;

    const userRecord = await this.prisma.client.user.findUnique({
      where: { username },
      select: { id: true, userPublicKey: true, userMlKemPublicKey: true },
    });

    let subject = data.subject || '';
    let bodyText = data.body || '';
    let bodyHtml = escapedBodyHtml || '';
    let toVal = data.to || '';
    let fromVal = from || '';
    let ccVal = data.cc || null;
    let bccVal = data.bcc || null;
    let encryptedKey = null;

    if (userRecord && userRecord.userPublicKey) {
      try {
        const dataKey = generateDataKey();
        subject = encrypt(subject, dataKey);
        bodyText = encrypt(bodyText, dataKey);
        bodyHtml = encrypt(bodyHtml, dataKey);

        if (toVal) toVal = encrypt(toVal, dataKey);
        if (fromVal) fromVal = encrypt(fromVal, dataKey);
        if (ccVal) ccVal = encrypt(ccVal, dataKey);
        if (bccVal) bccVal = encrypt(bccVal, dataKey);

        encryptedKey = (await wrapKey(
          dataKey,
          userRecord.userPublicKey,
          userRecord.userMlKemPublicKey,
        )) as any;
      } catch (encErr) {
        this.logger.error(`E2EE encryption failed for draft email:`, encErr);
      }
    }

    // Create the message in database
    const savedMessage = await this.prisma.client.emailMessage.create({
      data: {
        userEmailAccountId: accountId,
        uid: nextUid,
        messageId: null,
        subject,
        from: fromVal,
        to: toVal,
        cc: ccVal || null,
        bcc: bccVal || null,
        date: new Date(),
        bodyText,
        bodyHtml,
        read: true,
        folder: 'drafts',
        encryptedKey: encryptedKey || undefined,
      },
    });

    try {
      if (userRecord) {
        this.gateway.sendToUser(userRecord.id, 'email:new', {
          accountId,
          folder: 'drafts',
          message: savedMessage,
        });
      }
    } catch (wsErr) {
      // Fail silently on WS broadcasting issues
    }

    return savedMessage;
  }

  async getUnifiedFolderMessages(
    username: string,
    folder: string,
    page?: number,
    limit?: number,
  ): Promise<any[]> {
    const accounts = await this.prisma.client.userEmailAccount.findMany({
      where: { username },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    const take = limit ? Number(limit) : 50;
    const skip = page ? (Number(page) - 1) * take : 0;

    return this.prisma.client.emailMessage.findMany({
      where: {
        userEmailAccountId: { in: accountIds },
        folder: folder.toLowerCase().trim(),
      },
      orderBy: { date: 'desc' },
      take,
      skip,
      select: {
        id: true,
        uid: true,
        messageId: true,
        subject: true,
        from: true,
        to: true,
        cc: true,
        bcc: true,
        date: true,
        read: true,
        flagged: true,
        folder: true,
        encryptedKey: true,
        userEmailAccountId: true,
        labels: true,
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

  async getAllMessages(
    username: string,
    limit?: number,
  ): Promise<any[]> {
    const accounts = await this.prisma.client.userEmailAccount.findMany({
      where: { username },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);
    const take = limit ? Number(limit) : 200;

    return this.prisma.client.emailMessage.findMany({
      where: {
        userEmailAccountId: { in: accountIds },
      },
      orderBy: { date: 'desc' },
      take,
      select: {
        id: true,
        uid: true,
        messageId: true,
        subject: true,
        from: true,
        to: true,
        cc: true,
        bcc: true,
        date: true,
        read: true,
        flagged: true,
        folder: true,
        encryptedKey: true,
        userEmailAccountId: true,
        labels: true,
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

  async getCannedResponses(
    username: string,
    page?: number,
    limit?: number,
  ): Promise<any[]> {
    const take = limit ? Number(limit) : 20;
    const skip = page ? (Number(page) - 1) * take : 0;

    return this.prisma.client.cannedResponse.findMany({
      where: { username },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }

  async createCannedResponse(
    username: string,
    data: { name: string; subject?: string; bodyText: string },
  ): Promise<any> {
    const user = await this.prisma.client.user.findUnique({
      where: { username },
      select: { userPublicKey: true, userMlKemPublicKey: true },
    });

    let subject = data.subject || '';
    let bodyText = data.bodyText || '';
    let encryptedKey = null;

    if (user && user.userPublicKey) {
      try {
        const dataKey = generateDataKey();
        if (subject) subject = encrypt(subject, dataKey);
        bodyText = encrypt(bodyText, dataKey);
        encryptedKey = (await wrapKey(
          dataKey,
          user.userPublicKey,
          user.userMlKemPublicKey,
        )) as any;
      } catch (encErr) {
        this.logger.error(`Canned response encryption failed:`, encErr);
      }
    }

    return this.prisma.client.cannedResponse.create({
      data: {
        username,
        name: data.name,
        subject,
        bodyText,
        encryptedKey: encryptedKey || undefined,
      },
    });
  }

  async updateCannedResponse(
    username: string,
    id: string,
    data: { name: string; subject?: string; bodyText: string },
  ): Promise<any> {
    const template = await this.prisma.client.cannedResponse.findFirst({
      where: { id, username },
    });
    if (!template)
      throw new rrNotFoundException(`${this.moduleCode}CRNF001`, {
        message: 'Canned response not found',
      });

    const user = await this.prisma.client.user.findUnique({
      where: { username },
      select: { userPublicKey: true, userMlKemPublicKey: true },
    });

    let subject = data.subject || '';
    let bodyText = data.bodyText || '';
    let encryptedKey = null;

    if (user && user.userPublicKey) {
      try {
        const dataKey = generateDataKey();
        if (subject) subject = encrypt(subject, dataKey);
        bodyText = encrypt(bodyText, dataKey);
        encryptedKey = (await wrapKey(
          dataKey,
          user.userPublicKey,
          user.userMlKemPublicKey,
        )) as any;
      } catch (encErr) {
        this.logger.error(`Canned response update encryption failed:`, encErr);
      }
    }

    return this.prisma.client.cannedResponse.update({
      where: { id },
      data: {
        name: data.name,
        subject,
        bodyText,
        encryptedKey: encryptedKey || undefined,
      },
    });
  }

  async deleteCannedResponse(
    username: string,
    id: string,
  ): Promise<{ success: boolean }> {
    const template = await this.prisma.client.cannedResponse.findFirst({
      where: { id, username },
    });
    if (!template)
      throw new rrNotFoundException(`${this.moduleCode}CRNF002`, {
        message: 'Canned response not found',
      });

    await this.prisma.client.cannedResponse.delete({
      where: { id },
    });
    return { success: true };
  }

  async getAttachment(attachmentId: string): Promise<any> {
    const attachment = await this.prisma.client.emailAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment)
      throw new rrNotFoundException(`${this.moduleCode}ANF001`, {
        message: 'Attachment not found',
      });
    return attachment;
  }

  async testConnection(data: TestEmailConnectionDto): Promise<{
    imap: { success: boolean; error?: string };
    smtp: { success: boolean; error?: string };
  }> {
    const authEmail = data.loginEmail?.trim() || data.emailAddress?.trim() || '';
    const result = {
      imap: { success: false, error: undefined as string | undefined },
      smtp: { success: false, error: undefined as string | undefined },
    };

    // Test IMAP
    try {
      const client = new ImapFlow({
        host: data.imapHost,
        port: data.imapPort,
        secure: data.imapSecure,
        auth: {
          user: authEmail,
          pass: data.password,
        },
        logger: false,
        clientInfo: {
          name: 'Runa Mail Verification',
          version: '1.0.0',
        },
      });

      await Promise.race([
        client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('IMAP connection timed out after 10s')), 10000),
        ),
      ]);

      await client.logout().catch(() => {});
      result.imap.success = true;
    } catch (err: any) {
      result.imap.success = false;
      result.imap.error = err.message || 'IMAP connection failed';
    }

    // Test SMTP
    try {
      const transporter = nodemailer.createTransport({
        host: data.smtpHost,
        port: data.smtpPort,
        secure: data.smtpSecure,
        auth: {
          user: authEmail,
          pass: data.password,
        },
        connectionTimeout: 10000,
      });

      await transporter.verify();
      result.smtp.success = true;
    } catch (err: any) {
      result.smtp.success = false;
      result.smtp.error = err.message || 'SMTP connection failed';
    }

    return result;
  }
}

