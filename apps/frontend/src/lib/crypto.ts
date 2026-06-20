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
