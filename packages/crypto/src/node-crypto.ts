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

function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || 'runa-fallback-encryption-secret-key-32-chars';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Unified Node Encrypt supporting string, Buffer, and objects.
 * Accepts Buffer or base64url raw key string.
 */
export function encrypt(data: string, key?: Buffer | string): string;
export function encrypt(data: Buffer, key?: Buffer | string): Buffer;
export function encrypt(data: Record<string, any> | any[], key?: Buffer | string): string;
export function encrypt(data: any, key?: Buffer | string): string | Buffer {
  const activeKey = key || getEncryptionKey();
  const useKey = typeof activeKey === 'string' ? base64UrlToBuffer(activeKey) : activeKey;

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
export function decrypt(data: string, key?: Buffer | string | (Buffer | string)[]): any;
export function decrypt(data: Buffer, key?: Buffer | string | (Buffer | string)[]): Buffer;
export function decrypt(data: any, key?: Buffer | string | (Buffer | string)[]): any {
  const activeKey = key || getEncryptionKey();
  const keys = Array.isArray(activeKey) ? activeKey : [activeKey];
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
