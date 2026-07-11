# Lacerta Drop - Direct P2P File Sharing Handoff Document

This document outlines the final architecture, protocol details, implemented fixes, and testing recommendations for the **Lacerta Drop** direct P2P file sharing module.

---

## 1. Feature Overview & Capabilities

* **Direct Local P2P Discovery**: Automatically discovers other online devices on the same local subnet using public IP clustering.
* **Incognito Mode**: Allows authenticated users to toggle their visibility settings on the network.
* **Double-Encryption Guarantee**: Performs client-side **AES-GCM payload encryption** (using WebCrypto API) on top of the mandatory **DTLS transport layer** provided by WebRTC.
* **Same-Device loopback Discovery**: Normalizes loopback addresses (such as `::1`, `localhost`, `::ffff:127.0.0.1`, and `127.0.0.1`) to ensure developer environments discover other local browser windows instantly.
* **E2EE Batch Transfer Protocol**: Allows sending multiple files concurrently under a single acceptance dialog, reusing open channels and resolving individual decryption key dropouts.

---

## 2. Key Architecture Files

* **Frontend Page**: [page.tsx](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa/apps/frontend/src/app/(apps)/lacerta/drop/page.tsx)
  * Renders the scanning radar, processes files via inputs or drag-and-drop targets, manages WebRTC peer connections/channels, performs chunk-level AES-GCM encryption/decryption, and displays itemized transfer cards.
* **Backend Gateway**: [sharing.gateway.ts](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa/apps/backend/src/modules/files/sharing.gateway.ts)
  * Handles NestJS WebSocket connections, extracts and clusters public IP subnets, validates accounts using decoded JWT payload properties (supporting both `username` and `name` attributes), and relays WebRTC SDP signals.

---

## 3. E2EE Batch Transfer Protocol Handshake

When a user shares a batch of files, the system employs the following WebRTC data channel handshake flow:

```
[Sender]                                                         [Receiver]
   |                                                                  |
   |---- (ASK_BATCH_TRANSFER: Encrypted Metadata & Batch Key) ------->|
   |                                                                  | (Unified Accept Dialog)
   |<--- (ACCEPT_BATCH_TRANSFER) -------------------------------------|
   |                                                                  |
   |---- (START_FILE: Index 0) -------------------------------------->|
   |---- (Streams AES-GCM Encrypted Chunks) ------------------------->|
   |---- (EOF: Index 0) --------------------------------------------->|
   |                                                                  | (Decrypts & Downloads File 0)
   |<--- (FILE_RECEIVED: Index 0) ------------------------------------|
   |                                                                  |
   |---- (START_FILE: Index 1) -------------------------------------->|
   |---- (Streams AES-GCM Encrypted Chunks) ------------------------->|
   |---- (EOF: Index 1) --------------------------------------------->|
   |                                                                  | (Decrypts & Downloads File 1)
   |<--- (FILE_RECEIVED: Index 1) ------------------------------------|
   |                                                                  |
   |---- (BATCH_COMPLETE) ------------------------------------------->|
   |                                                                  |
```

---

## 4. Key Bug Fixes & Technical Implementation Rationale

### A. NextAuth Token Race Conditions
* **Problem**: On page load, NextAuth is `"loading"`, so the socket initialized with an empty token. Once session resolved, the hook didn't re-initialize the connection.
* **Fix**: Decoupled socket mounts by adding `accessToken` to the dependency array. The socket is only opened when the access token is fully loaded, preventing connection rejections.

### B. React Asynchronous State Update Batching
* **Problem**: In loops, React `useState` changes are batched. Iterations checked `transfer` state to decide whether to queue or initiate a connection, initiating all selected files simultaneously.
* **Fix**: Introduced a synchronous lock ref (`isTransferInProgress.current`) to immediately block subsequent iterations from bypassing the queue.

### C. WebRTC SDP Renegotiation Conflicts (`InvalidModificationError`)
* **Problem**: Sequential queue items triggered teardown and renegotiation timeouts while previous channels were still active, throwing `Changing the mid of m-sections is not allowed` errors.
* **Fix**: Removed successful completion teardown timeouts. Once a WebRTC data channel is established, it remains open and is reused for subsequent files in the batch. Teardown is only triggered upon cancellations, declines, or disconnects.

### D. ICE Candidate Out-of-Order Execution
* **Problem**: Remote ICE candidates arrived before the remote description was applied, crashing with `SetRemoteDescription must be called first` exceptions.
* **Fix**: Implemented a candidate buffer (`pendingCandidates.current`) to store early candidates, applying them sequentially once `setRemoteDescription` completes.

---

## 5. Verification & Testing Playbook

1. **Local Setup**:
   * Open two different browsers (e.g. Chrome and Firefox) and navigate to `http://localhost:3000/lacerta/drop`.
   * Log in to two separate developer test accounts (ensuring same-device/different-account rendering is verified).
2. **Visibility Checks**:
   * Discovered nodes should immediately display device types (Mobile, Tablet, Desktop) and platform details (browser name and OS).
   * Verify that toggling the "Incognito" visibility setting updates the other scanner screen instantly without page reloads.
3. **Batch Sharing & Verification**:
   * Drag multiple files onto the target device node or click it to select them from the file picker.
   * Verify that the receiver receives a single modal window listing all files.
   * Accept the transfer and verify that the progress card details updates dynamically (completed files show checkmarks, active files show progress bars/speed rates, pending files wait sequentially).
   * Ensure files decrypt cleanly and trigger browser downloads at 100% completion.
