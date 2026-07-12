import {
  generateDataKey,
  encrypt,
  decrypt,
  wrapKey,
  unwrapKey,
} from '@runa/crypto/node';
import * as crypto from 'crypto';

describe('E2E Crypto Utilities via @runa/crypto/node', () => {
  it('should generate a 32-byte data key', () => {
    const dataKey = generateDataKey();
    expect(dataKey).toBeInstanceOf(Buffer);
    expect(dataKey.length).toBe(32);
  });

  it('should encrypt and decrypt a string using data key', () => {
    const dataKey = generateDataKey();
    const secretMessage = 'Hello Polaris E2EE Email!';

    const ciphertext = encrypt(secretMessage, dataKey);
    expect(ciphertext).toContain(':');

    const plaintext = decrypt(ciphertext, dataKey);
    expect(plaintext).toBe(secretMessage);
  });

  it('should encrypt and decrypt a binary buffer using data key', () => {
    const dataKey = generateDataKey();
    const dataBuffer = Buffer.from('Binary content for attachments...', 'utf8');

    const encryptedBuf = encrypt(dataBuffer, dataKey);
    expect(encryptedBuf.length).toBeGreaterThan(dataBuffer.length);

    const decryptedBuf = decrypt(encryptedBuf, dataKey);
    expect(decryptedBuf.toString('utf8')).toBe(dataBuffer.toString('utf8'));
  });

  it('should perform hybrid ECDH key agreement to wrap and unwrap a data key', async () => {
    // 1. Generate client keypair (prime256v1 / P-256)
    const clientEcdh = crypto.createECDH('prime256v1');
    clientEcdh.generateKeys();
    const clientPublicKeyBase64Url = clientEcdh.getPublicKey('base64url');
    const clientPrivateKey = clientEcdh.getPrivateKey();

    // 2. Generate a random data key
    const dataKey = generateDataKey();

    // 3. Wrap dataKey for client using client's public key
    const wrappedPayload = await wrapKey(dataKey, clientPublicKeyBase64Url);

    expect(wrappedPayload.ephemeralPublicKey).toBeDefined();
    expect(wrappedPayload.iv).toBeDefined();
    expect(wrappedPayload.tag).toBeDefined();
    expect(wrappedPayload.ciphertext).toBeDefined();

    // 4. Unwrap wrapped key on client using client's private key
    const unwrappedDataKey = unwrapKey(wrappedPayload, clientPrivateKey);

    expect(unwrappedDataKey.toString('hex')).toBe(dataKey.toString('hex'));
  });
});
