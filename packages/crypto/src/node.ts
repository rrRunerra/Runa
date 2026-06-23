import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function base64UrlToBuffer(base64url: string): Buffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

function bufferToBase64Url(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface EncryptedKeyPayload {
  ephemeralPublicKey: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

/**
 * Generates a random 256-bit symmetric data key for a single email message
 */
export function generateDataKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Encrypts a plaintext string using the symmetric data key with AES-256-GCM
 */
export function encryptWithDataKey(text: string, dataKey: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, dataKey, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Format: iv:ciphertext:tag
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Encrypts a binary buffer using the symmetric data key with AES-256-GCM
 */
export function encryptBufferWithDataKey(buffer: Buffer, dataKey: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, dataKey, iv);
  
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  // Format: iv(12B) | tag(16B) | ciphertext
  return Buffer.concat([iv, tag, ciphertext]);
}

/**
 * Encrypts the symmetric email data key for a user's public ECDH key (via ECDH key agreement)
 */
export function encryptDataKeyForUser(userPublicKeyBase64Url: string, dataKey: Buffer): EncryptedKeyPayload {
  const userPublicKeyBuf = base64UrlToBuffer(userPublicKeyBase64Url);

  // Generate server ephemeral ECDH keypair on prime256v1 (P-256)
  const serverEcdh = crypto.createECDH('prime256v1');
  serverEcdh.generateKeys();
  const ephemeralPublicKey = serverEcdh.getPublicKey();

  // Perform ECDH agreement
  const sharedSecret = serverEcdh.computeSecret(userPublicKeyBuf);

  // Derive AES wrapping key using SHA-256
  const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();

  // Encrypt the email data key with the derived key
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, aesKey, iv);
  
  const ciphertext = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ephemeralPublicKey: bufferToBase64Url(ephemeralPublicKey),
    iv: bufferToBase64Url(iv),
    tag: bufferToBase64Url(tag),
    ciphertext: bufferToBase64Url(ciphertext)
  };
}
