import { generateDataKey, encryptWithDataKey, encryptBufferWithDataKey, encryptDataKeyForUser } from './e2e-crypto';
import * as crypto from 'crypto';

function decryptDataKeyForUser(
  encryptedPayload: { ephemeralPublicKey: string; iv: string; tag: string; ciphertext: string },
  userPrivateKeyBuf: Buffer
): Buffer {
  const ephemeralPublicKeyBuf = Buffer.from(encryptedPayload.ephemeralPublicKey, 'base64url');
  
  const clientEcdh = crypto.createECDH('prime256v1');
  clientEcdh.setPrivateKey(userPrivateKeyBuf);
  
  const sharedSecret = clientEcdh.computeSecret(ephemeralPublicKeyBuf);
  const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();
  
  const ivBuf = Buffer.from(encryptedPayload.iv, 'base64url');
  const ciphertextBuf = Buffer.from(encryptedPayload.ciphertext, 'base64url');
  const tagBuf = Buffer.from(encryptedPayload.tag, 'base64url');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, ivBuf);
  decipher.setAuthTag(tagBuf);
  
  return Buffer.concat([decipher.update(ciphertextBuf), decipher.final()]);
}

function decryptWithDataKey(encryptedText: string, dataKey: Buffer): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted).toString('utf8');
  decrypted += decipher.final().toString('utf8');

  return decrypted;
}

function decryptBufferWithDataKey(encryptedBuffer: Buffer, dataKey: Buffer): Buffer {
  if (encryptedBuffer.length < 28) {
    throw new Error('Invalid encrypted buffer format');
  }

  const iv = encryptedBuffer.subarray(0, 12);
  const tag = encryptedBuffer.subarray(12, 28);
  const ciphertext = encryptedBuffer.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

describe('E2E Crypto Utilities', () => {
  it('should generate a 32-byte data key', () => {
    const dataKey = generateDataKey();
    expect(dataKey).toBeInstanceOf(Buffer);
    expect(dataKey.length).toBe(32);
  });

  it('should encrypt and decrypt a string using data key', () => {
    const dataKey = generateDataKey();
    const secretMessage = 'Hello Polaris E2EE Email!';
    
    const ciphertext = encryptWithDataKey(secretMessage, dataKey);
    expect(ciphertext).toContain(':');
    
    const plaintext = decryptWithDataKey(ciphertext, dataKey);
    expect(plaintext).toBe(secretMessage);
  });

  it('should encrypt and decrypt a binary buffer using data key', () => {
    const dataKey = generateDataKey();
    const dataBuffer = Buffer.from('Binary content for attachments...', 'utf8');
    
    const encryptedBuf = encryptBufferWithDataKey(dataBuffer, dataKey);
    expect(encryptedBuf.length).toBeGreaterThan(dataBuffer.length);
    
    const decryptedBuf = decryptBufferWithDataKey(encryptedBuf, dataKey);
    expect(decryptedBuf.toString('utf8')).toBe(dataBuffer.toString('utf8'));
  });

  it('should perform hybrid ECDH key agreement to wrap and unwrap a data key', () => {
    // 1. Generate client keypair (prime256v1 / P-256)
    const clientEcdh = crypto.createECDH('prime256v1');
    clientEcdh.generateKeys();
    const clientPublicKeyBase64Url = clientEcdh.getPublicKey('base64url');
    const clientPrivateKey = clientEcdh.getPrivateKey();

    // 2. Generate a random data key
    const dataKey = generateDataKey();

    // 3. Encrypt dataKey for client using client's public key
    const wrappedPayload = encryptDataKeyForUser(clientPublicKeyBase64Url, dataKey);
    
    expect(wrappedPayload.ephemeralPublicKey).toBeDefined();
    expect(wrappedPayload.iv).toBeDefined();
    expect(wrappedPayload.tag).toBeDefined();
    expect(wrappedPayload.ciphertext).toBeDefined();

    // 4. Decrypt wrapped key on client using client's private key
    const unwrappedDataKey = decryptDataKeyForUser(wrappedPayload, clientPrivateKey);
    
    expect(unwrappedDataKey.toString('hex')).toBe(dataKey.toString('hex'));
  });
});
