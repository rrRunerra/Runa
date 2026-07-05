/**
 * Lacerta Browser-based E2EE Cryptography Helpers
 * Implements local encryption of files and metadata before upload.
 */

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
  const { base64UrlToBuffer } = await import("@runa/crypto/browser");
  const buffer = base64UrlToBuffer(base64UrlKey);
  return window.crypto.subtle.importKey(
    "raw",
    buffer,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

// Wrap file key for recipient via ECIES (ECDH Ephemeral-Static DH + AES-GCM wrap)
// Matches decryptEmailDataKey format on decrypt
export async function wrapFileKeyForUser(
  rawKey: string,
  recipientPublicKeyStr: string
): Promise<string> {
  const { importPublicKey, bufferToBase64Url, base64UrlToBuffer } = await import("@runa/crypto/browser");
  
  const recipientPublicKey = await importPublicKey(recipientPublicKeyStr);

  const ephemeralKeyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const sharedSecretBits = await window.crypto.subtle.deriveBits(
    { name: "ECDH", public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    256
  );

  const aesKeyBuffer = await window.crypto.subtle.digest("SHA-256", sharedSecretBits);

  const wrappingKey = await window.crypto.subtle.importKey(
    "raw",
    aesKeyBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const rawKeyBuffer = base64UrlToBuffer(rawKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    rawKeyBuffer
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tag = encryptedBytes.slice(encryptedBytes.length - 16);

  const exportedEphemeralPub = await window.crypto.subtle.exportKey("raw", ephemeralKeyPair.publicKey);

  return JSON.stringify({
    ephemeralPublicKey: bufferToBase64Url(exportedEphemeralPub),
    iv: bufferToBase64Url(iv.buffer),
    tag: bufferToBase64Url(tag.buffer),
    ciphertext: bufferToBase64Url(ciphertext.buffer),
  });
}

// Unwrap file key using user private key (ECDH)
export async function unwrapFileKeyForUser(
  wrappedJson: string,
  ownPrivateKey: CryptoKey
): Promise<string> {
  const { base64UrlToBuffer, bufferToBase64Url } = await import("@runa/crypto/browser");
  const payload = JSON.parse(wrappedJson);

  const ephemeralPubBuf = base64UrlToBuffer(payload.ephemeralPublicKey);
  const ephemeralPublicKey = await window.crypto.subtle.importKey(
    "raw",
    ephemeralPubBuf,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );

  const sharedSecretBits = await window.crypto.subtle.deriveBits(
    { name: "ECDH", public: ephemeralPublicKey },
    ownPrivateKey,
    256
  );

  const aesKeyBuffer = await window.crypto.subtle.digest("SHA-256", sharedSecretBits);

  const wrappingKey = await window.crypto.subtle.importKey(
    "raw",
    aesKeyBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const ciphertextBuf = base64UrlToBuffer(payload.ciphertext);
  const ivBuf = base64UrlToBuffer(payload.iv);
  const tagBuf = base64UrlToBuffer(payload.tag);

  const ciphertextWithTag = new Uint8Array(ciphertextBuf.byteLength + tagBuf.byteLength);
  ciphertextWithTag.set(new Uint8Array(ciphertextBuf), 0);
  ciphertextWithTag.set(new Uint8Array(tagBuf), ciphertextBuf.byteLength);

  const rawDecryptedKey = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(ivBuf) },
    wrappingKey,
    ciphertextWithTag
  );

  return bufferToBase64Url(rawDecryptedKey);
}

// Encrypt file contents (ArrayBuffer) using file key
export async function encryptFileBuffer(
  buffer: ArrayBuffer,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    buffer
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tag = encryptedBytes.slice(encryptedBytes.length - 16);

  // Format: [ iv (12B) | tag (16B) | ciphertext ]
  const final = new Uint8Array(12 + 16 + ciphertext.length);
  final.set(iv, 0);
  final.set(tag, 12);
  final.set(ciphertext, 28);
  return final.buffer;
}

// Decrypt file contents (ArrayBuffer) using file key
export async function decryptFileBuffer(
  buffer: ArrayBuffer,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const { decryptEmailBuffer } = await import("@runa/crypto/browser");
  return decryptEmailBuffer(buffer, key);
}

// Encrypt a string metadata using file key
export async function encryptMetadataString(
  text: string,
  key: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tag = encryptedBytes.slice(encryptedBytes.length - 16);

  const bufToHex = (buf: ArrayBuffer) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return `${bufToHex(iv.buffer)}:${bufToHex(ciphertext.buffer)}:${bufToHex(tag.buffer)}`;
}

// Decrypt a string metadata using file key
export async function decryptMetadataString(
  encryptedText: string,
  key: CryptoKey
): Promise<string> {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted metadata format');
  }

  const hexToBuf = (hex: string) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
  };

  const iv = new Uint8Array(hexToBuf(parts[0]));
  const ciphertext = new Uint8Array(hexToBuf(parts[1]));
  const tag = new Uint8Array(hexToBuf(parts[2]));

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    combined
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
