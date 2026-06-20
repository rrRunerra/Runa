import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { PrismaService } from '../../providers/database/prisma.service';
import { decrypt } from '../../common/utils/crypto';
import { NotificationGateway } from '../notification/notification.gateway';

interface SyncState {
  lastSyncAt: number;
  intervalMs: number;
}

@Injectable()
export class EmailSyncService {
  private readonly logger = new Logger(EmailSyncService.name);
  private syncStates = new Map<string, SyncState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleSyncCron(): Promise<void> {
    this.logger.log('Checking background email sync scheduler...');

    try {
      const accounts = await this.prisma.client.userEmailAccount.findMany();
      const now = Date.now();

      for (const account of accounts) {
        let state = this.syncStates.get(account.id);

        if (!state) {
          // Dynamic jittered random interval: 5 to 10 minutes in ms
          const randomMin = 5 + Math.random() * 5;
          const intervalMs = Math.floor(randomMin * 60 * 1000);

          state = {
            lastSyncAt: 0, // Force sync immediately on startup
            intervalMs,
          };
          this.syncStates.set(account.id, state);
        }

        if (now - state.lastSyncAt >= state.intervalMs) {
          this.logger.log(
            `Triggering email sync for account ${account.emailAddress} (Interval: ${Math.round(
              state.intervalMs / 1000,
            )}s)`,
          );

          // Trigger sync task in the background
          this.syncAccount(account.id).catch(err => {
            this.logger.error(`Error syncing account ${account.emailAddress}:`, err);
          });

          // Jitter the next sync schedule interval
          const nextRandomMin = 5 + Math.random() * 5;
          state.lastSyncAt = now;
          state.intervalMs = Math.floor(nextRandomMin * 60 * 1000);
        }
      }
    } catch (err) {
      this.logger.error('Failed to query email accounts for sync scheduler:', err);
    }
  }

  async syncAccount(accountId: string): Promise<void> {
    const account = await this.prisma.client.userEmailAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) return;

    let decryptedPassword = '';
    try {
      decryptedPassword = decrypt(account.encryptedPassword);
    } catch (e) {
      this.logger.error(`Failed to decrypt password for account ${account.emailAddress}`);
      return;
    }

    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSecure,
      auth: {
        user: account.loginEmail || account.emailAddress,
        pass: decryptedPassword,
      },
      logger: false,
    });

    try {
      await client.connect();

      const folders = await client.list();
      for (const folder of folders) {
        const standardFolder = this.getStandardFolderName(folder);

        const lock = await client.getMailboxLock(folder.path);
        try {
          // Get the highest cached UID for this folder
          const lastMessage = await this.prisma.client.emailMessage.findFirst({
            where: { userEmailAccountId: account.id, folder: standardFolder },
            orderBy: { uid: 'desc' },
            select: { uid: true },
          });
          const lastUid = lastMessage ? lastMessage.uid : 0;

          // Fetch only newer UIDs
          const range = `${lastUid + 1}:*`;
          const uids = await client.search({ uid: range }, { uid: true });

          if (Array.isArray(uids) && uids.length > 0) {
            for await (const msg of client.fetch(
              uids,
              { uid: true, source: true, flags: true },
              { uid: true },
            )) {
              if (msg.uid <= lastUid) continue;

              const source = msg.source;
              if (!source) continue;

            let parsed;
            try {
              parsed = await simpleParser(source);
            } catch (parseErr) {
              this.logger.error(
                `Failed to parse raw RFC822 email source for UID ${msg.uid} in ${folder.path}:`,
                parseErr,
              );
              continue;
            }

            const subject = parsed.subject || '';
            const fromStr = parsed.from ? parsed.from.text : '';
            const toStr = parsed.to
              ? Array.isArray(parsed.to)
                ? parsed.to.map((t: any) => t.text).join(', ')
                : parsed.to.text
              : '';
            const ccStr = parsed.cc
              ? Array.isArray(parsed.cc)
                ? parsed.cc.map((t: any) => t.text).join(', ')
                : parsed.cc.text
              : '';
            const bccStr = parsed.bcc
              ? Array.isArray(parsed.bcc)
                ? parsed.bcc.map((t: any) => t.text).join(', ')
                : parsed.bcc.text
              : '';
            const date = parsed.date || new Date();
            const bodyText = parsed.text || '';
            const bodyHtml = parsed.html || '';

            // Cache metadata and body content locally in the database
            const emailRecord = await this.prisma.client.emailMessage.create({
              data: {
                userEmailAccountId: account.id,
                uid: msg.uid,
                messageId: parsed.messageId || null,
                subject,
                from: fromStr,
                to: toStr,
                cc: ccStr || null,
                bcc: bccStr || null,
                date,
                bodyText,
                bodyHtml,
                read: msg.flags ? msg.flags.has('\\Seen') : false,
                flagged: msg.flags ? msg.flags.has('\\Flagged') : false,
                folder: standardFolder,
              },
            });

            try {
              const user = await this.prisma.client.user.findUnique({
                where: { username: account.username },
              });
              if (user) {
                // Emit email:new for live inbox list updates
                this.gateway.sendToUser(user.id, 'email:new', {
                  accountId: account.id,
                  folder: standardFolder,
                  message: emailRecord,
                });

                // Create a system notification if email is unread and in Inbox
                if (standardFolder === 'inbox' && !emailRecord.read) {
                  const notif = await this.prisma.client.notification.create({
                    data: {
                      userId: user.id,
                      title: subject || '(No Subject)',
                      message: `New email from ${fromStr}`,
                      type: 'INFO',
                      status: 'PENDING',
                      metadata: {
                        type: 'email',
                        emailAccountId: account.id,
                        emailFolder: standardFolder,
                        emailMessageId: emailRecord.id,
                      },
                    },
                  });

                  this.gateway.sendToUser(user.id, 'notification:created', {
                    id: notif.id,
                    userId: notif.userId,
                    title: notif.title,
                    message: notif.message,
                    type: notif.type,
                    status: notif.status,
                    metadata: notif.metadata,
                    createdAt: notif.createdAt,
                  });
                }
              }
            } catch (wsErr) {
              this.logger.error('WebSocket email sync broadcast failed:', wsErr);
            }

            // Parse and cache attachments as binary blobs (Bytes) in the database
            if (parsed.attachments && parsed.attachments.length > 0) {
              for (const attach of parsed.attachments) {
                await this.prisma.client.emailAttachment.create({
                  data: {
                    emailMessageId: emailRecord.id,
                    filename: attach.filename || 'unnamed',
                    contentType: attach.contentType,
                    size: attach.size,
                    content: attach.content, // Buffer
                  },
                });
              }
            }
          }
        }
        } catch (folderErr) {
          this.logger.error(`Error syncing folder ${folder.path} for account ${account.emailAddress}:`, folderErr);
        } finally {
          lock.release();
        }
      }
    } catch (connErr) {
      this.logger.error(`IMAP connection error for account ${account.emailAddress}:`, connErr);
    } finally {
      try {
        await client.logout();
      } catch (err) {
        // Fail silently on logout
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
}
