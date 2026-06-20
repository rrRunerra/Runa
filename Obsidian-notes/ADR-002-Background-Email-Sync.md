# ADR 002: Background Email Synchronization Architecture

* **Status:** Approved
* **Date:** 2026-06-20
* **Authors:** Antigravity (AI Coding Assistant) & User

---

## Context & Problem Statement

To provide a fully-functional mail experience in Runa (Pegasus), we need to synchronize emails from external IMAP servers in the background. Synced emails must be indexed, cached, and searchable locally. Furthermore, if a synchronized email is deleted on the external mail server, it must remain preserved in the local database to support permanent archiving/local backups.

---

## Decision Drivers

* **Offline Capabilities & Durability:** Synced messages must be downloaded entirely (body text/HTML and metadata) so they survive external deletions.
* **Server Overhead Control:** Sync intervals must be jittered to prevent thundering herd problems when many user accounts attempt to connect simultaneously.
* **Resource Optimization:** We should avoid persistent IMAP IDLE connections which hold open network sockets, opting instead for scheduled polling.
* **Ease of Implementation:** Use standard, well-maintained libraries.

---

## Final Decisions

### 1. scheduled Polling (Jittered Interval)
* **Frequency:** Each email account is synchronized periodically on a random interval between 5 to 10 minutes.
* **Scheduling:** We will use `@nestjs/schedule` (under the hood relying on `cron`) running a scheduler task every minute. The service will verify if the elapsed time since an account's last successful sync exceeds its dynamically assigned random interval (calculated on the fly), and trigger sync.

### 2. Full Local Database Caching
* **Depth:** The synchronization process fetches and parses the entire mail structure, saving:
  - Envelope metadata: Sender, Recipients (To/Cc/Bcc), Subject, Date, IMAP UID, Message-ID.
  - Body Content: Plain text (`bodyText`) and HTML (`bodyHtml`).
  - Read/Unread state flags.
  - Email Folders structure (Inbox, Sent, Drafts, Trash, etc.).
* **Attachment Storage:** Email attachments are saved in the database referencing the message to guarantee data permanence even when deleted on the remote server.

### 3. Protocols & Library Selection
* **Library:** We will use `imapflow` for connection, authentication, navigation, and fetching from external IMAP mail servers. It is fully promise-based, asynchronous, and robust.

### 4. Database Schema Design (Prisma)
We will introduce two new database models to `packages/database/schema.prisma`:
* `EmailMessage`: Caches envelopes and full text/HTML bodies, keyed to `UserEmailAccount` and mapped by folder name.
* `EmailAttachment`: Caches metadata and binary content of attachments linked to their respective `EmailMessage`.

```prisma
model EmailMessage {
    id                 String            @id @default(nanoid())
    userEmailAccountId String
    uid                Int
    messageId          String?
    subject            String?
    from               String?
    to                 String?
    cc                 String?
    bcc                String?
    date               DateTime?
    bodyText           String?
    bodyHtml           String?
    read               Boolean           @default(false)
    flagged            Boolean           @default(false)
    folder             String            // e.g. "INBOX", "Sent", "Trash"
    createdAt          DateTime          @default(now())
    updatedAt          DateTime          @updatedAt
    emailAccount       UserEmailAccount  @relation(fields: [userEmailAccountId], references: [id], onDelete: Cascade)
    attachments        EmailAttachment[]

    @@unique([userEmailAccountId, folder, uid])
    @@index([userEmailAccountId])
}

model EmailAttachment {
    id             String       @id @default(nanoid())
    emailMessageId String
    filename       String
    contentType    String
    size           Int
    content        Bytes        // Binary blob of the attachment
    createdAt      DateTime     @default(now())
    emailMessage   EmailMessage @relation(fields: [emailMessageId], references: [id], onDelete: Cascade)

    @@index([emailMessageId])
}
```

---

## Consequences

* **Prisma Regeneration:** Adding these models requires running `pnpm db:generate` to rebuild the Prisma client.
* **Database Growth:** Storing full email bodies and attachments locally will cause database size to scale directly with the volume of emails synced. Database maintenance and size limits will need to be addressed in production environments.
* **Robust Archiving:** Users will never lose emails due to external IMAP changes or server purging, making Pegasus a highly resilient backup system.
