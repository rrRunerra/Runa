import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export interface EncryptedKeyPayload {
  ephemeralPublicKey: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

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

/**
 * Generates a random 256-bit symmetric data key
 */
export function generateDataKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Unified Node Encrypt supporting string, Buffer, and objects.
 * Accepts Buffer or base64url raw key string.
 */
export function encrypt(data: string, key: Buffer | string): string;
export function encrypt(data: Buffer, key: Buffer | string): Buffer;
export function encrypt(data: Record<string, any> | any[], key: Buffer | string): string;
export function encrypt(data: any, key: Buffer | string): string | Buffer {
  const useKey = typeof key === 'string' ? base64UrlToBuffer(key) : key;

  if (Buffer.isBuffer(data)) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, useKey, iv);
    const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]);
  }

  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, useKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Unified Node Decrypt supporting string, Buffer, and JSON payloads.
 * Accepts single or multiple Buffer or base64url raw key strings.
 */
export function decrypt(data: string, key: Buffer | string | (Buffer | string)[]): any;
export function decrypt(data: Buffer, key: Buffer | string | (Buffer | string)[]): Buffer;
export function decrypt(data: any, key: Buffer | string | (Buffer | string)[]): any {
  const keys = Array.isArray(key) ? key : [key];
  let lastError: any = null;

  for (const k of keys) {
    try {
      const useKey = typeof k === 'string' ? base64UrlToBuffer(k) : k;

      if (Buffer.isBuffer(data)) {
        if (data.length < 28) {
          throw new Error('Invalid encrypted buffer format');
        }
        const iv = data.subarray(0, 12);
        const tag = data.subarray(12, 28);
        const ciphertext = data.subarray(28);

        const decipher = crypto.createDecipheriv(ALGORITHM, useKey, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      }

      if (typeof data === 'string') {
        const parts = data.split(':');
        if (parts.length !== 3) {
          throw new Error('Invalid encrypted text format');
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = Buffer.from(parts[1], 'hex');
        const tag = Buffer.from(parts[2], 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, useKey, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted).toString('utf8');
        decrypted += decipher.final().toString('utf8');

        try {
          return JSON.parse(decrypted);
        } catch {
          return decrypted;
        }
      }

      throw new Error('Unsupported data type for decryption');
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Decryption failed with all provided keys');
}

/**
 * Unified asymmetric key wrapping for E2EE hybrid encryption in Node.
 */
export function wrapKey(
  rawKey: Buffer | string,
  recipientPublicKeyBase64Url: string
): EncryptedKeyPayload {
  const userPublicKeyBuf = base64UrlToBuffer(recipientPublicKeyBase64Url);

  const serverEcdh = crypto.createECDH('prime256v1');
  serverEcdh.generateKeys();
  const ephemeralPublicKey = serverEcdh.getPublicKey();

  const sharedSecret = serverEcdh.computeSecret(userPublicKeyBuf);
  const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();

  const useRawKey = typeof rawKey === 'string' ? base64UrlToBuffer(rawKey) : rawKey;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, aesKey, iv);
  const ciphertext = Buffer.concat([cipher.update(useRawKey), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ephemeralPublicKey: bufferToBase64Url(ephemeralPublicKey),
    iv: bufferToBase64Url(iv),
    tag: bufferToBase64Url(tag),
    ciphertext: bufferToBase64Url(ciphertext)
  };
}

/**
 * Unified asymmetric key unwrapping in Node. Supports single or multiple private keys.
 */
export function unwrapKey(
  wrappedKey: EncryptedKeyPayload | string,
  privateKey: Buffer | Buffer[] | string | string[]
): Buffer {
  const payload: EncryptedKeyPayload = typeof wrappedKey === 'string'
    ? JSON.parse(wrappedKey)
    : wrappedKey;

  const pKeys = Array.isArray(privateKey) ? privateKey : [privateKey];
  let lastError: any = null;

  for (const privKey of pKeys) {
    try {
      const usePrivKey = typeof privKey === 'string' ? base64UrlToBuffer(privKey) : privKey;
      const ephemeralPublicKeyBuf = base64UrlToBuffer(payload.ephemeralPublicKey);

      const clientEcdh = crypto.createECDH('prime256v1');
      clientEcdh.setPrivateKey(usePrivKey);

      const sharedSecret = clientEcdh.computeSecret(ephemeralPublicKeyBuf);
      const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();

      const ivBuf = base64UrlToBuffer(payload.iv);
      const ciphertextBuf = base64UrlToBuffer(payload.ciphertext);
      const tagBuf = base64UrlToBuffer(payload.tag);

      const decipher = crypto.createDecipheriv(ALGORITHM, aesKey, ivBuf);
      decipher.setAuthTag(tagBuf);

      return Buffer.concat([decipher.update(ciphertextBuf), decipher.final()]);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to unwrap key with all provided private keys');
}
