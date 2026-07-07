"use client";

import { useCallback } from "react";
import { useRrCryptoContext } from "@/components/Providers/rrCryptoProvider";
import * as cryptoBrowser from "@runa/crypto/browser";

export function useRRCrypto() {
  const context = useRrCryptoContext();
  const { getPrivateKey, privateKey } = context;

  const encrypt = useCallback(
    async (
      data: any,
      key: CryptoKey | string
    ): Promise<any> => {
      return cryptoBrowser.encrypt(data, key as any);
    },
    []
  );

  const decrypt = useCallback(
    async (
      data: any,
      key: CryptoKey | string | (CryptoKey | string)[]
    ): Promise<any> => {
      return cryptoBrowser.decrypt(data, key as any);
    },
    []
  );

  const wrapKey = useCallback(
    async (
      rawKey: string | CryptoKey,
      recipientPublicKeyStr: string | CryptoKey
    ): Promise<cryptoBrowser.EncryptedKeyPayload> => {
      return cryptoBrowser.wrapKey(rawKey, recipientPublicKeyStr);
    },
    []
  );

  const unwrapKey = useCallback(
    async (
      wrappedKey: cryptoBrowser.EncryptedKeyPayload | string,
      privKey?: CryptoKey | CryptoKey[]
    ): Promise<CryptoKey> => {
      let keyToUse = privKey;
      if (!keyToUse) {
        const activeKey = await getPrivateKey();
        keyToUse = activeKey || privateKey || undefined;
      }
      if (!keyToUse) {
        throw new Error(
          "No private key available for unwrapping. E2EE might be locked."
        );
      }
      return cryptoBrowser.unwrapKey(wrappedKey, keyToUse);
    },
    [getPrivateKey, privateKey]
  );

  /**
   * Helper to decrypt E2E wrapped data in one step.
   * Unwraps the symmetric data key using the user's private key from context,
   * then decrypts the payload with that symmetric key.
   */
  const decryptE2ee = useCallback(
    async (
      data: any,
      wrappedKey: cryptoBrowser.EncryptedKeyPayload | string
    ): Promise<any> => {
      const dataKey = await unwrapKey(wrappedKey);
      return decrypt(data, dataKey);
    },
    [unwrapKey, decrypt]
  );

  return {
    ...context,
    encrypt,
    decrypt,
    wrapKey,
    unwrapKey,
    decryptE2ee,
  };
}
