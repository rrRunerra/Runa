import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { PrismaService } from '../../providers/database/prisma.service';
import { decrypt } from '@runa/crypto/server';
import { generateDataKey, encrypt, wrapKey } from '@runa/crypto/node';
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
    if (process.env.NODE_ENV === 'development') {
      return;
    }
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
          this.logger.debug(
            `Triggering email sync for account ${account.emailAddress} (Interval: ${Math.round(
              state.intervalMs / 1000,
            )}s)`,
          );

          // Trigger sync task in the background
          this.syncAccount(account.id).catch((err) => {
            this.logger.error(
              `Error syncing account ...${account.emailAddress.split('@')[1]}:`,
              err,
            );
          });

          // Jitter the next sync schedule interval
          const nextRandomMin = 5 + Math.random() * 5;
          state.lastSyncAt = now;
          state.intervalMs = Math.floor(nextRandomMin * 60 * 1000);
        }
      }
    } catch (err) {
      this.logger.error(
        'Failed to query email accounts for sync scheduler:',
        err,
      );
    }
  }

  async syncAccount(accountId: string): Promise<void> {
    const account = await this.prisma.client.userEmailAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) return;

    const user = await this.prisma.client.user.findUnique({
      where: { username: account.username },
      select: { id: true, userPublicKey: true },
    });

    let decryptedPassword = '';
    try {
      decryptedPassword = decrypt(account.encryptedPassword);
    } catch (e) {
      this.logger.error(
        `Failed to decrypt password for account ${account.emailAddress}`,
      );
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

    client.on('error', (err: Error): void => {
      this.logger.error(
        `IMAP client error for account ${account.emailAddress}:`,
        err,
      );
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

          // Query all UIDs from the server to find new/missing messages
          const allServerUids = (await client.search({}, { uid: true })) || [];
          const serverUidSet = new Set(allServerUids);

          // Find all local message UIDs stored in the DB for this folder
          const dbMessages = await this.prisma.client.emailMessage.findMany({
            where: { userEmailAccountId: account.id, folder: standardFolder },
            select: { uid: true },
          });
          const dbUids = dbMessages.map((m) => m.uid);

          // Find UIDs in the database that are no longer on the server
          const uidsToDelete = dbUids.filter((uid) => !serverUidSet.has(uid));

          if (uidsToDelete.length > 0) {
            this.logger.log(
              `Deleting ${uidsToDelete.length} messages in folder ${standardFolder} for account ${account.emailAddress} that are no longer on the server: [${uidsToDelete.join(', ')}]`,
            );
            await this.prisma.client.emailMessage.deleteMany({
              where: {
                userEmailAccountId: account.id,
                folder: standardFolder,
                uid: { in: uidsToDelete },
              },
            });
          }

          // Fetch only UIDs that are newer than the highest cached UID
          const uids = allServerUids.filter((uid) => uid > lastUid);

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

              let subject = parsed.subject || '';
              let fromStr = parsed.from ? parsed.from.text : '';
              let toStr = parsed.to
                ? Array.isArray(parsed.to)
                  ? parsed.to.map((t: any) => t.text).join(', ')
                  : parsed.to.text
                : '';
              let ccStr = parsed.cc
                ? Array.isArray(parsed.cc)
                  ? parsed.cc.map((t: any) => t.text).join(', ')
                  : parsed.cc.text
                : '';
              let bccStr = parsed.bcc
                ? Array.isArray(parsed.bcc)
                  ? parsed.bcc.map((t: any) => t.text).join(', ')
                  : parsed.bcc.text
                : '';
              const date = parsed.date || new Date();
              let bodyText = parsed.text || '';
              let bodyHtml = parsed.html || '';

              let encryptedKey = null;
              let dataKey: Buffer | null = null;

              if (user && user.userPublicKey) {
                try {
                  dataKey = generateDataKey();
                  subject = encrypt(subject, dataKey);
                  bodyText = encrypt(bodyText, dataKey);
                  bodyHtml = encrypt(bodyHtml, dataKey);

                  if (fromStr) fromStr = encrypt(fromStr, dataKey);
                  if (toStr) toStr = encrypt(toStr, dataKey);
                  if (ccStr) ccStr = encrypt(ccStr, dataKey);
                  if (bccStr) bccStr = encrypt(bccStr, dataKey);

                  encryptedKey = wrapKey(dataKey, user.userPublicKey) as any;
                } catch (encErr) {
                  this.logger.error(
                    `E2EE encryption failed for UID ${msg.uid} on account ${account.emailAddress}:`,
                    encErr,
                  );
                  dataKey = null;
                }
              }

              // Cache metadata and body content locally in the database
              const emailRecord = await this.prisma.client.emailMessage.upsert({
                where: {
                  userEmailAccountId_folder_uid: {
                    userEmailAccountId: account.id,
                    folder: standardFolder,
                    uid: msg.uid,
                  },
                },
                update: {
                  // Optionally update flags on re-sync
                  read: msg.flags ? msg.flags.has('\\Seen') : false,
                  flagged: msg.flags ? msg.flags.has('\\Flagged') : false,
                },
                create: {
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
                  encryptedKey: encryptedKey || undefined,
                },
              });

              try {
                const userRecord = await this.prisma.client.user.findUnique({
                  where: { username: account.username },
                });
                if (userRecord) {
                  // Emit email:new for live inbox list updates
                  this.gateway.sendToUser(userRecord.id, 'email:new', {
                    accountId: account.id,
                    folder: standardFolder,
                    message: emailRecord,
                  });

                  // Create a system notification if email is unread and in Inbox
                  if (standardFolder === 'inbox' && !emailRecord.read) {
                    let notifTitle = parsed.subject || '(No Subject)';
                    let notifMessage = `New email from ${fromStr}`;

                    if (dataKey && encryptedKey) {
                      try {
                        notifTitle = encrypt(notifTitle, dataKey);
                        notifMessage = encrypt(
                          `New email from ${parsed.from ? parsed.from.text : ''}`,
                          dataKey,
                        );
                      } catch (notifEncErr) {
                        this.logger.error(
                          'Failed to encrypt notification titles/messages:',
                          notifEncErr,
                        );
                      }
                    }

                    const metadataPayload: any = {
                      type: 'email',
                      emailAccountId: account.id,
                      emailFolder: standardFolder,
                      emailMessageId: emailRecord.id,
                    };
                    if (encryptedKey) {
                      metadataPayload.encryptedKey = encryptedKey;
                    }

                    const notif = await this.prisma.client.notification.create({
                      data: {
                        userId: userRecord.id,
                        title: notifTitle,
                        message: notifMessage,
                        type: 'INFO',
                        status: 'PENDING',
                        metadata: metadataPayload,
                      },
                    });

                    this.gateway.sendToUser(
                      userRecord.id,
                      'notification:created',
                      {
                        id: notif.id,
                        userId: notif.userId,
                        title: notif.title,
                        message: notif.message,
                        type: notif.type,
                        status: notif.status,
                        metadata: notif.metadata,
                        createdAt: notif.createdAt,
                      },
                    );
                  }
                }
              } catch (wsErr) {
                this.logger.error(
                  'WebSocket email sync broadcast failed:',
                  wsErr,
                );
              }

              // Parse and cache attachments as binary blobs (Bytes) in the database
              if (parsed.attachments && parsed.attachments.length > 0) {
                for (const attach of parsed.attachments) {
                  let filename = attach.filename || 'unnamed';
                  let content = attach.content;

                  if (dataKey) {
                    try {
                      filename = encrypt(filename, dataKey);
                      content = encrypt(content, dataKey);
                    } catch (attachEncErr) {
                      this.logger.error(
                        `Attachment E2EE encryption failed for UID ${msg.uid}:`,
                        attachEncErr,
                      );
                    }
                  }

                  await this.prisma.client.emailAttachment.create({
                    data: {
                      emailMessageId: emailRecord.id,
                      filename,
                      contentType: attach.contentType,
                      size: attach.size,
                      content, // Buffer
                    },
                  });
                }
              }
            }
          }
        } catch (folderErr) {
          this.logger.error(
            `Error syncing folder ${folder.path} for account ${account.emailAddress}:`,
            folderErr,
          );
        } finally {
          lock.release();
        }
      }
    } catch (connErr) {
      this.logger.error(
        `IMAP connection error for account ${account.emailAddress}:`,
        connErr,
      );
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
}
