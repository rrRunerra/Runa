/**
 * Lacerta Browser-based E2EE Cryptography Helpers
 * Implements local encryption of files and metadata before upload.
 * Delegated to the unified @runa/crypto package.
 */

import {
  encrypt,
  decrypt,
  wrapKey,
  unwrapKey,
  importRawKey as coreImportRawKey,
} from "@runa/crypto/browser";

// Helper to generate a random 256-bit AES-GCM key
export async function generateFileKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export CryptoKey to Base64Url format
export async function exportRawKey(key: CryptoKey): Promise<string> {
  const raw = await window.crypto.subtle.exportKey("raw", key);
  const { bufferToBase64Url } = await import("@runa/crypto/browser");
  return bufferToBase64Url(raw);
}

// Import raw Base64Url format into CryptoKey
export async function importRawKey(base64UrlKey: string): Promise<CryptoKey> {
  return coreImportRawKey(base64UrlKey);
}

// Wrap file key for recipient via ECIES (ECDH Ephemeral-Static DH + AES-GCM wrap)
export async function wrapFileKeyForUser(
  rawKey: string,
  recipientPublicKeyStr: string
): Promise<string> {
  const payload = await wrapKey(rawKey, recipientPublicKeyStr);
  return JSON.stringify(payload);
}

// Unwrap file key using user private key (ECDH)
export async function unwrapFileKeyForUser(
  wrappedJson: string,
  ownPrivateKey: CryptoKey
): Promise<string> {
  const payload = JSON.parse(wrappedJson);
  const dataKey = await unwrapKey(payload, ownPrivateKey);
  return exportRawKey(dataKey);
}

// Encrypt file contents (ArrayBuffer) using file key
export async function encryptFileBuffer(
  buffer: ArrayBuffer,
  key: CryptoKey
): Promise<ArrayBuffer> {
  return encrypt(buffer, key);
}

// Decrypt file contents (ArrayBuffer) using file key
export async function decryptFileBuffer(
  buffer: ArrayBuffer,
  key: CryptoKey
): Promise<ArrayBuffer> {
  return decrypt(buffer, key);
}

// Encrypt a string metadata using file key
export async function encryptMetadataString(
  text: string,
  key: CryptoKey
): Promise<string> {
  return encrypt(text, key);
}

export async function decryptMetadataString(
  encryptedText: string,
  key: CryptoKey
): Promise<string> {
  const res = await decrypt(encryptedText, key);
  return typeof res === "string" ? res : JSON.stringify(res);
}
