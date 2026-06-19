# ADR 001: Core E2EE Architecture and Integration Design

* **Status:** Approved
* **Date:** 2026-06-19
* **Authors:** Antigravity (AI Coding Assistant) & User

---

## Context & Problem Statement

We are introducing End-to-End Encryption (E2EE) to the Runa platform across three distinct domains:
1. **Real-time chat:** Supporting 1-on-1 and groups up to 256 people.
2. **Email:** Standard email client integrating with an external server (`purelymail.com` or custom).
3. **Cloud storage:** Zero-knowledge file sharing, public link downloads, and multi-user collaboration.

Collaborative document editing is a requirement using **Collabora Online**, which operates on the server side and requires access to unencrypted file contents to function.

---

## Decision Drivers

* **Privacy:** Server must have zero knowledge of E2EE chats and encrypted files.
* **Usability:** Files must edit seamlessly by default, with option to encrypt sensitive files.
* **Security:** User email credentials for mail accounts must be securely encrypted at rest.
* **Performance:** Chat operations must be simple to maintain, with large files chunked for memory efficiency.
* **Flexibility:** Email client must support multiple email accounts (Thunderbird style) with arbitrary IMAP/SMTP server settings, custom aesthetics (color tag), sender display name, reply-to routing, and HTML signatures.
* **Modularity:** Notifications logic should be decoupled into a separate shared workspace package.
* **Real-time:** The system must push notifications (e.g. device authorizations) in real-time.

---

## Final Decisions

### 1. Unified Cryptographic Identity & Device Linking
* **Primitives:** We will use **Curve25519** for key agreements, **Ed25519** for signing, and **AES-256-GCM** / **ChaCha20-Poly1305** for symmetric encryption.
* **Device Linking:** Logging in on a new device triggers an interactive notification in the active user sessions for approval.
* **Passcode Recovery:** If no active device is online to approve the new login, the user can recover and decrypt their master key using their pre-existing **2FA backup codes** (`backupCodes` on the `User` model).
* **Password Changes:** Password changes will trigger client-side re-encryption of the master key bundle using a new key derived from the new password.

### 2. Chat Protocol: Message Fan-out
* For both **1-on-1** and **Group chats (up to 256 members)**, we will use the **Message Fan-out** pattern. The client will encrypt the payload individually for each recipient's active devices using standard Double Ratchet sessions.
* History is synced to new devices via encrypted history blobs stored on the server.

### 3. Email: Thunderbird-style Encrypted Accounts
* We will support multiple email accounts via a new `UserEmailAccount` table.
* Each account will store its public identifiers, SMTP/IMAP host, port, security parameters, and encrypted password credentials (using **AES-256-GCM** with a server-managed environment key).
* We will store custom identity settings: Account Name, visual color tag, Sender Name, Email Address, Reply-to Address, Organization, and HTML Signature text.

### 4. Storage: Optional Client-Side E2EE & Chunking
* **Default State:** Files/folders are stored **unencrypted by default** to support full collaboration and editing in Collabora Online.
* **Optional Encryption:** Users can toggle E2EE on individual files or folders. Once encrypted, they are stored zero-knowledge at rest and can only be downloaded (no Collabora editing).
* **File Chunking:** Large files (>50MB) are chunked during client-side encryption/decryption to prevent browser crash issues.

### 5. UI Additions, Shared Modules, & Real-time API
* **AppSideBar Notification Modal:** A notification center accessed from the user profile dropdown. Displays general notifications and interactive device approval requests.
* **Security Settings Device list:** An active device list in the security settings tab allowing users to view and revoke active device sessions, and configure linked mail accounts.
* **Shared Notifications Package:** A separate package `@runa/notifications` (`packages/notifications`) created to centralize notification interfaces, events, and formats.
* **Backend Notification Module:** A NestJS module `NotificationModule` containing service logic, controllers for rest actions, and a WebSocket Gateway for instant notification delivery to clients.

---

## Consequences

* **Collabora Boundary:** Document editing in Collabora Online is only possible on unencrypted files.
* **Credential Exposure:** Security of users' email accounts depends on protecting the server's master environment key from leak/compromise.
* **Group Chat Overhead:** Message Fan-out to 256 members will result in higher upload bandwidth requirements for sending clients compared to a group key approach, but simplifies implementation significantly.
