/**
 * Web Crypto E2EE Helper Utilities
 * Uses native browser SubtleCrypto APIs (ECDH P-256 & AES-GCM).
 */

const AES_GCM = ["AES", "GCM"].join("-");

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
 * Encrypts a message (or Master Key) using AES-GCM
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

/**
 * Decrypts data using AES-GCM
 */
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
 * Performs a DH exchange between the sender's device private key and the receiver's device public key,
 * derives an AES key, and encrypts the master key payload.
 */
export async function encryptMasterKeyForDevice(
  masterKeyHexOrBase64: string,
  targetDevicePublicKeyBase64: string,
  ownPrivateKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const targetPublicKey = await importPublicKey(targetDevicePublicKeyBase64);

  // Derive shared symmetric key
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

  // Encrypt the master key material
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

  // Derive shared symmetric key
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
 * Decrypts the symmetric email data key using the user's private ECDH key
 */
export async function decryptEmailDataKey(
  payload: { ephemeralPublicKey: string; iv: string; tag: string; ciphertext: string },
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const serverPubKeyBuf = base64UrlToBuffer(payload.ephemeralPublicKey);
  const serverPublicKey = await window.crypto.subtle.importKey(
    'raw',
    serverPubKeyBuf,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );

  const sharedSecretBits = await window.crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: serverPublicKey
    },
    privateKey,
    256
  );

  const aesKeyBuffer = await window.crypto.subtle.digest('SHA-256', sharedSecretBits);

  const wrappingKey = await window.crypto.subtle.importKey(
    'raw',
    aesKeyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const ciphertextBuf = base64UrlToBuffer(payload.ciphertext);
  const ivBuf = base64UrlToBuffer(payload.iv);
  const tagBuf = base64UrlToBuffer(payload.tag);

  const ciphertextWithTag = new Uint8Array(ciphertextBuf.byteLength + tagBuf.byteLength);
  ciphertextWithTag.set(new Uint8Array(ciphertextBuf), 0);
  ciphertextWithTag.set(new Uint8Array(tagBuf), ciphertextBuf.byteLength);

  const rawDataKey = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuf)
    },
    wrappingKey,
    ciphertextWithTag
  );

  return window.crypto.subtle.importKey(
    'raw',
    rawDataKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
}

/**
 * Decrypts a string that was encrypted on the server in "iv:ciphertext:tag" (hex) format
 */
export async function decryptEmailString(encryptedText: string, dataKey: CryptoKey): Promise<string> {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted email text format');
  }

  const hexToBuf = (hex: string) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
  };

  const iv = hexToBuf(parts[0]);
  const ciphertext = hexToBuf(parts[1]);
  const tag = hexToBuf(parts[2]);

  const ciphertextWithTag = new Uint8Array(ciphertext.byteLength + tag.byteLength);
  ciphertextWithTag.set(new Uint8Array(ciphertext), 0);
  ciphertextWithTag.set(new Uint8Array(tag), ciphertext.byteLength);

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv)
    },
    dataKey,
    ciphertextWithTag
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Decrypts a buffer that was encrypted on the server in "[iv (12B) | tag (16B) | ciphertext]" format
 */
export async function decryptEmailBuffer(encryptedBuffer: ArrayBuffer, dataKey: CryptoKey): Promise<ArrayBuffer> {
  if (encryptedBuffer.byteLength < 28) {
    throw new Error('Invalid encrypted email buffer format');
  }

  const iv = encryptedBuffer.slice(0, 12);
  const tag = encryptedBuffer.slice(12, 28);
  const ciphertext = encryptedBuffer.slice(28);

  const ciphertextWithTag = new Uint8Array(ciphertext.byteLength + tag.byteLength);
  ciphertextWithTag.set(new Uint8Array(ciphertext), 0);
  ciphertextWithTag.set(new Uint8Array(tag), ciphertext.byteLength);

  return window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv)
    },
    dataKey,
    ciphertextWithTag
  );
}
