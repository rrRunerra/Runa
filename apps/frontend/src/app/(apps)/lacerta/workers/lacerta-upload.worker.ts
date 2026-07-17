/**
 * lacerta-upload.worker.ts
 *
 * Web Worker for the Lacerta chunked E2EE upload pipeline.
 * Runs off the main thread so encryption and network I/O never block the UI.
 *
 * Protocol (postMessage):
 *   Inbound:  { type: 'start', ...StartPayload }
 *             { type: 'abort' }
 *   Outbound: { type: 'progress', completedChunks, totalChunks }
 *             { type: 'part-done', partNumber, etag }
 *             { type: 'done' }
 *             { type: 'error', message }
 */

export {};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StartPayload {
  type: 'start';
  /** The File object to upload (transferred by reference) */
  file: File;
  /** LaceraFile.id returned by POST /upload/init */
  fileId: string;
  /** S3 UploadId returned by POST /upload/init */
  uploadId: string;
  /** Raw AES-256-GCM file key as base64url — re-imported inside the worker */
  rawFileKey: string;
  /** User JWT access token for Authorization header */
  accessToken: string;
  /** Total number of 32 MiB chunks */
  chunkCount: number;
  /** Parts already successfully uploaded (for resume) */
  completedParts: CompletedPart[];
  /** process.env.NEXT_PUBLIC_API_URL */
  apiUrl: string;
  /** Chunk size in bytes (default 32 MiB) */
  chunkSize: number;
}

interface CompletedPart {
  partNumber: number;
  etag: string;
}

type InboundMessage = StartPayload | { type: 'abort' };

// ---------------------------------------------------------------------------
// Worker state
// ---------------------------------------------------------------------------

let aborted = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Encrypt a single chunk with AES-256-GCM using a unique 96-bit IV.
 * Wire format matches the existing @runa/crypto/browser convention:
 *   [12 B IV][16 B auth tag][ciphertext]
 *
 * AAD binds fileId, partNumber, chunkCount, and original file size so
 * a rogue server cannot reorder or substitute chunks.
 */
async function encryptChunk(
  chunkBuffer: ArrayBuffer,
  cryptoKey: CryptoKey,
  fileId: string,
  partNumber: number,
  chunkCount: number,
  originalSize: number,
): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // AAD: fileId|partNumber|chunkCount|originalSize
  const aad = new TextEncoder().encode(
    `${fileId}|${partNumber}|${chunkCount}|${originalSize}`,
  );

  // SubtleCrypto.encrypt with additionalData returns ciphertext||tag (tag is last 16 B)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    cryptoKey,
    chunkBuffer,
  );

  const encBytes = new Uint8Array(encrypted);
  const ciphertext = encBytes.slice(0, encBytes.length - 16);
  const tag = encBytes.slice(encBytes.length - 16);

  // Layout: IV(12) | tag(16) | ciphertext
  const wire = new Uint8Array(12 + 16 + ciphertext.length);
  wire.set(iv, 0);
  wire.set(tag, 12);
  wire.set(ciphertext, 28);
  return wire.buffer;
}

/**
 * Upload a single encrypted chunk to the backend, which streams it to S3.
 * Returns the ETag from the server response.
 */
async function uploadChunk(
  wireBuffer: ArrayBuffer,
  partNumber: number,
  fileId: string,
  accessToken: string,
  apiUrl: string,
): Promise<string> {
  const url = `${apiUrl}/files/lacerta/upload/part?fileId=${encodeURIComponent(fileId)}&partNumber=${partNumber}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': wireBuffer.byteLength.toString(),
    },
    body: wireBuffer,
    // @ts-expect-error — duplex is required for streaming bodies in some runtimes
    duplex: 'half',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Part ${partNumber} upload failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as { etag: string; partNumber: number };
  return json.etag;
}

/**
 * Run a bounded-concurrency promise pool.
 * @param tasks - Array of zero-arg async functions
 * @param concurrency - Max parallel executions
 */
async function runPool(
  tasks: Array<() => Promise<void>>,
  concurrency: number,
): Promise<void> {
  const queue = [...tasks];
  const workers: Promise<void>[] = [];

  const runNext = async (): Promise<void> => {
    while (queue.length > 0) {
      const task = queue.shift()!;
      await task();
    }
  };

  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
    workers.push(runNext());
  }

  await Promise.all(workers);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

self.onmessage = async (event: MessageEvent<InboundMessage>) => {
  const msg = event.data;

  if (msg.type === 'abort') {
    aborted = true;
    return;
  }

  if (msg.type !== 'start') return;

  aborted = false;
  const {
    file,
    fileId,
    rawFileKey,
    accessToken,
    chunkCount,
    completedParts,
    apiUrl,
    chunkSize,
  } = msg;

  try {
    // Import the AES-256-GCM file key inside the worker
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      base64UrlToBuffer(rawFileKey),
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    );

    // Build the set of already-completed part numbers for resume
    const doneSet = new Set(completedParts.map((p) => p.partNumber));
    let completedCount = completedParts.length;

    // Build upload tasks for each remaining part
    const tasks = Array.from({ length: chunkCount }, (_, i) => {
      const partNumber = i + 1;
      return async (): Promise<void> => {
        if (aborted) return;

        // Skip parts already uploaded (resume path)
        if (doneSet.has(partNumber)) return;

        // Slice the file — only this chunk is loaded into memory at a time
        const start = (partNumber - 1) * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const sliceBuffer = await file.slice(start, end).arrayBuffer();

        // Encrypt
        const wireBuffer = await encryptChunk(
          sliceBuffer,
          cryptoKey,
          fileId,
          partNumber,
          chunkCount,
          file.size,
        );

        if (aborted) return;

        // Upload — stream to backend, which pipes to S3
        const etag = await uploadChunk(
          wireBuffer,
          partNumber,
          fileId,
          accessToken,
          apiUrl,
        );

        completedCount += 1;
        doneSet.add(partNumber);

        // Report progress back to main thread
        self.postMessage({
          type: 'part-done',
          partNumber,
          etag,
          completedChunks: completedCount,
          totalChunks: chunkCount,
        });

        self.postMessage({
          type: 'progress',
          completedChunks: completedCount,
          totalChunks: chunkCount,
        });
      };
    });

    await runPool(tasks, 4 /* LACERTA_UPLOAD_CONCURRENCY */);

    if (aborted) {
      self.postMessage({ type: 'error', message: 'Upload aborted' });
      return;
    }

    self.postMessage({ type: 'done' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown upload error';
    self.postMessage({ type: 'error', message });
  }
};
