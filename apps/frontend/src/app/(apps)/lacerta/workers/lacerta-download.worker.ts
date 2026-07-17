/**
 * lacerta-download.worker.ts
 *
 * Web Worker for the Lacerta chunked E2EE download decryption.
 * Keeps heavy decryption and buffer handling out of the main thread.
 */

export {};

// Overhead per chunk: 12 B IV + 16 B auth tag = 28 B
const CHUNK_OVERHEAD = 28;
const CHUNK_PLAINTEXT_SIZE = 32 * 1024 * 1024; // 32 MiB

interface DecryptPayload {
  type: 'decrypt-chunk';
  chunkIndex: number;
  wireBuffer: ArrayBuffer;
  rawFileKey: string;
  fileId: string;
  partNumber: number;
  chunkCount: number;
  originalSize: number;
}

type InboundMessage = DecryptPayload;

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function decryptChunk(
  wire: ArrayBuffer,
  key: CryptoKey,
  fileId: string,
  partNumber: number,
  chunkCount: number,
  originalSize: number,
): Promise<ArrayBuffer> {
  if (wire.byteLength < CHUNK_OVERHEAD) {
    throw new Error(`Chunk ${partNumber} too small to be valid ciphertext`);
  }
  const iv = wire.slice(0, 12);
  const tag = wire.slice(12, 28);
  const ciphertext = wire.slice(28);

  const ciphertextWithTag = new Uint8Array(ciphertext.byteLength + tag.byteLength);
  ciphertextWithTag.set(new Uint8Array(ciphertext), 0);
  ciphertextWithTag.set(new Uint8Array(tag), ciphertext.byteLength);

  const aad = new TextEncoder().encode(
    `${fileId}|${partNumber}|${chunkCount}|${originalSize}`,
  );

  return self.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv), additionalData: aad },
    key,
    ciphertextWithTag
  );
}

self.onmessage = async (event: MessageEvent<InboundMessage>) => {
  const msg = event.data;
  if (msg.type !== 'decrypt-chunk') return;

  try {
    const key = await self.crypto.subtle.importKey(
      'raw',
      base64UrlToBuffer(msg.rawFileKey),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const plaintext = await decryptChunk(
      msg.wireBuffer,
      key,
      msg.fileId,
      msg.partNumber,
      msg.chunkCount,
      msg.originalSize
    );

    // Transfer the plaintext buffer back to free memory instantly on this side
    (self as any).postMessage({
      type: 'chunk-decrypted',
      chunkIndex: msg.chunkIndex,
      plaintext
    }, [plaintext]);
  } catch (err: any) {
    (self as any).postMessage({
      type: 'error',
      chunkIndex: msg.chunkIndex,
      error: err.message
    });
  }
};
