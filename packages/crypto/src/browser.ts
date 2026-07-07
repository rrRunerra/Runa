/**
 * Web Crypto E2EE Helper Utilities
 * Uses native browser SubtleCrypto APIs (ECDH P-256 & AES-GCM).
 */

const AES_GCM = "AES-GCM";

export interface EncryptedKeyPayload {
  ephemeralPublicKey: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

// Helper to convert ArrayBuffer to Base64url
export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper to convert Base64url to ArrayBuffer
export function base64UrlToBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a symmetric master key from a user password and username (as salt)
 */
export async function deriveMasterKey(password: string, username: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(username + 'runa-salt-constant-string');

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: AES_GCM, length: 256 },
    true, // exportable
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates an ECDH key pair for device identity
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Exports a public CryptoKey to raw Base64url format
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return bufferToBase64Url(exported);
}

/**
 * Imports a raw Base64url public key into a CryptoKey for ECDH
 */
export async function importPublicKey(base64UrlKey: string): Promise<CryptoKey> {
  const buffer = base64UrlToBuffer(base64UrlKey);
  return window.crypto.subtle.importKey(
    'raw',
    buffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );
}

/**
 * Imports a raw Base64url AES-GCM key into a CryptoKey
 */
export async function importRawKey(base64UrlKey: string): Promise<CryptoKey> {
  const buffer = base64UrlToBuffer(base64UrlKey);
  return window.crypto.subtle.importKey(
    'raw',
    buffer,
    { name: AES_GCM },
    true,
    ['encrypt', 'decrypt']
  );
}

const bufToHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hexToBuf = (hex: string): ArrayBuffer => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
};

/**
 * Unified Encrypt supporting string, ArrayBuffer, and objects.
 * Accepts CryptoKey or base64url raw key string.
 */
export async function encrypt(data: string, key: CryptoKey | string): Promise<string>;
export async function encrypt(data: ArrayBuffer, key: CryptoKey | string): Promise<ArrayBuffer>;
export async function encrypt(data: Record<string, any> | any[], key: CryptoKey | string): Promise<string>;
export async function encrypt(data: any, key: CryptoKey | string): Promise<string | ArrayBuffer> {
  let cryptoKey: CryptoKey;
  if (typeof key === 'string') {
    cryptoKey = await importRawKey(key);
  } else {
    cryptoKey = key;
  }

  if (data instanceof ArrayBuffer) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: AES_GCM, iv },
      cryptoKey,
      data
    );
    const encryptedBytes = new Uint8Array(encrypted);
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
    const tag = encryptedBytes.slice(encryptedBytes.length - 16);

    const final = new Uint8Array(12 + 16 + ciphertext.length);
    final.set(iv, 0);
    final.set(tag, 12);
    final.set(ciphertext, 28);
    return final.buffer;
  }

  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const encoder = new TextEncoder();
  const plaintextBuffer = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: AES_GCM, iv },
    cryptoKey,
    plaintextBuffer
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tag = encryptedBytes.slice(encryptedBytes.length - 16);

  return `${bufToHex(iv.buffer)}:${bufToHex(ciphertext.buffer)}:${bufToHex(tag.buffer)}`;
}

/**
 * Unified Decrypt supporting string, ArrayBuffer, and JSON payloads.
 * Accepts single or multiple CryptoKey or base64url raw key strings.
 */
export async function decrypt(data: string, key: CryptoKey | string | (CryptoKey | string)[]): Promise<any>;
export async function decrypt(data: ArrayBuffer, key: CryptoKey | string | (CryptoKey | string)[]): Promise<ArrayBuffer>;
export async function decrypt(data: any, key: CryptoKey | string | (CryptoKey | string)[]): Promise<any> {
  const keys = Array.isArray(key) ? key : [key];
  let lastError: any = null;

  for (const k of keys) {
    try {
      let cryptoKey: CryptoKey;
      if (typeof k === 'string') {
        cryptoKey = await importRawKey(k);
      } else {
        cryptoKey = k;
      }

      if (data instanceof ArrayBuffer) {
        if (data.byteLength < 28) {
          throw new Error('Invalid encrypted buffer format');
        }
        const iv = data.slice(0, 12);
        const tag = data.slice(12, 28);
        const ciphertext = data.slice(28);

        const ciphertextWithTag = new Uint8Array(ciphertext.byteLength + tag.byteLength);
        ciphertextWithTag.set(new Uint8Array(ciphertext), 0);
        ciphertextWithTag.set(new Uint8Array(tag), ciphertext.byteLength);

        return await window.crypto.subtle.decrypt(
          { name: AES_GCM, iv: new Uint8Array(iv) },
          cryptoKey,
          ciphertextWithTag
        );
      }

      if (typeof data === 'string') {
        const parts = data.split(':');
        if (parts.length !== 3) {
          throw new Error('Invalid encrypted text format');
        }
        const iv = new Uint8Array(hexToBuf(parts[0]));
        const ciphertext = new Uint8Array(hexToBuf(parts[1]));
        const tag = new Uint8Array(hexToBuf(parts[2]));

        const combined = new Uint8Array(ciphertext.length + tag.length);
        combined.set(ciphertext, 0);
        combined.set(tag, ciphertext.length);

        const decrypted = await window.crypto.subtle.decrypt(
          { name: AES_GCM, iv },
          cryptoKey,
          combined
        );

        const text = new TextDecoder().decode(decrypted);
        try {
          return JSON.parse(text);
        } catch {
          return text;
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
 * Raw encryption/decryption functions to preserve compatibility for private E2EE key storage.
 */
export async function encryptData(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: AES_GCM,
      iv: iv
    },
    key,
    dataBuffer
  );

  return {
    ciphertext: bufferToBase64Url(encrypted),
    iv: bufferToBase64Url(iv.buffer)
  };
}

export async function decryptData(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const encryptedBuffer = base64UrlToBuffer(ciphertextBase64);
  const ivBuffer = base64UrlToBuffer(ivBase64);

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: AES_GCM,
      iv: new Uint8Array(ivBuffer)
    },
    key,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypts the Master Key for a target device using ECDH key agreement.
 */
export async function encryptMasterKeyForDevice(
  masterKeyHexOrBase64: string,
  targetDevicePublicKeyBase64: string,
  ownPrivateKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const targetPublicKey = await importPublicKey(targetDevicePublicKeyBase64);

  const sharedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: targetPublicKey
    },
    ownPrivateKey,
    {
      name: AES_GCM,
      length: 256
    },
    false,
    ['encrypt']
  );

  return encryptData(masterKeyHexOrBase64, sharedKey);
}

/**
 * Decrypts the Master Key on the receiving device using ECDH key agreement.
 */
export async function decryptMasterKeyFromDevice(
  encryptedPayload: string,
  iv: string,
  senderPublicKeyBase64: string,
  ownPrivateKey: CryptoKey
): Promise<string> {
  const senderPublicKey = await importPublicKey(senderPublicKeyBase64);

  const sharedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: senderPublicKey
    },
    ownPrivateKey,
    {
      name: AES_GCM,
      length: 256
    },
    false,
    ['decrypt']
  );

  return decryptData(encryptedPayload, iv, sharedKey);
}

/**
 * Unified asymmetric key wrapping for E2EE hybrid encryption.
 */
export async function wrapKey(
  rawKey: string | CryptoKey,
  recipientPublicKeyStr: string | CryptoKey
): Promise<EncryptedKeyPayload> {
  const recipientPublicKey = typeof recipientPublicKeyStr === 'string'
    ? await importPublicKey(recipientPublicKeyStr)
    : recipientPublicKeyStr;

  const ephemeralKeyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  const sharedSecretBits = await window.crypto.subtle.deriveBits(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    256
  );

  const aesKeyBuffer = await window.crypto.subtle.digest('SHA-256', sharedSecretBits);

  const wrappingKey = await window.crypto.subtle.importKey(
    'raw',
    aesKeyBuffer,
    { name: AES_GCM },
    false,
    ['encrypt']
  );

  let rawKeyBuffer: ArrayBuffer;
  if (typeof rawKey === 'string') {
    rawKeyBuffer = base64UrlToBuffer(rawKey);
  } else {
    rawKeyBuffer = await window.crypto.subtle.exportKey('raw', rawKey);
  }

  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: AES_GCM, iv },
    wrappingKey,
    rawKeyBuffer
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tag = encryptedBytes.slice(encryptedBytes.length - 16);

  const exportedEphemeralPub = await window.crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey);

  return {
    ephemeralPublicKey: bufferToBase64Url(exportedEphemeralPub),
    iv: bufferToBase64Url(iv.buffer),
    tag: bufferToBase64Url(tag.buffer),
    ciphertext: bufferToBase64Url(ciphertext.buffer),
  };
}

/**
 * Unified asymmetric key unwrapping. Supports single or multiple private keys.
 */
export async function unwrapKey(
  wrappedKey: EncryptedKeyPayload | string,
  privateKey: CryptoKey | CryptoKey[]
): Promise<CryptoKey> {
  const payload: EncryptedKeyPayload = typeof wrappedKey === 'string'
    ? JSON.parse(wrappedKey)
    : wrappedKey;

  const privateKeys = Array.isArray(privateKey) ? privateKey : [privateKey];
  let lastError: any = null;

  for (const privKey of privateKeys) {
    try {
      const ephemeralPubBuf = base64UrlToBuffer(payload.ephemeralPublicKey);
      const ephemeralPublicKey = await window.crypto.subtle.importKey(
        'raw',
        ephemeralPubBuf,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        []
      );

      const sharedSecretBits = await window.crypto.subtle.deriveBits(
        { name: 'ECDH', public: ephemeralPublicKey },
        privKey,
        256
      );

      const aesKeyBuffer = await window.crypto.subtle.digest('SHA-256', sharedSecretBits);

      const wrappingKey = await window.crypto.subtle.importKey(
        'raw',
        aesKeyBuffer,
        { name: AES_GCM },
        false,
        ['decrypt']
      );

      const ciphertextBuf = base64UrlToBuffer(payload.ciphertext);
      const ivBuf = base64UrlToBuffer(payload.iv);
      const tagBuf = base64UrlToBuffer(payload.tag);

      const ciphertextWithTag = new Uint8Array(ciphertextBuf.byteLength + tagBuf.byteLength);
      ciphertextWithTag.set(new Uint8Array(ciphertextBuf), 0);
      ciphertextWithTag.set(new Uint8Array(tagBuf), ciphertextBuf.byteLength);

      const rawDecryptedKey = await window.crypto.subtle.decrypt(
        { name: AES_GCM, iv: new Uint8Array(ivBuf) },
        wrappingKey,
        ciphertextWithTag
      );

      return await window.crypto.subtle.importKey(
        'raw',
        rawDecryptedKey,
        { name: AES_GCM },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to unwrap key with all provided private keys');
}
