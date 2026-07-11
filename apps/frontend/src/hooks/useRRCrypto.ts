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
      recipientPublicKey: string | CryptoKey | { userPublicKey: string; userMlKemPublicKey?: string | null }
    ): Promise<any> => {
      if (
        recipientPublicKey &&
        typeof recipientPublicKey === "object" &&
        !(recipientPublicKey instanceof CryptoKey) &&
        "userPublicKey" in recipientPublicKey &&
        recipientPublicKey.userMlKemPublicKey
      ) {
        const { base64UrlToBuffer } = await import("@runa/crypto/browser");
        const recipientMlKemBytes = new Uint8Array(
          base64UrlToBuffer(recipientPublicKey.userMlKemPublicKey)
        );
        return cryptoBrowser.hybridWrapKey(
          rawKey,
          recipientPublicKey.userPublicKey,
          recipientMlKemBytes
        );
      }

      // Check if recipient is current user and we have their ML-KEM key available in context
      if (
        typeof recipientPublicKey === "string" &&
        recipientPublicKey === context.userPublicKey &&
        context.userMlKemPublicKey
      ) {
        const { base64UrlToBuffer } = await import("@runa/crypto/browser");
        const recipientMlKemBytes = new Uint8Array(
          base64UrlToBuffer(context.userMlKemPublicKey)
        );
        return cryptoBrowser.hybridWrapKey(
          rawKey,
          recipientPublicKey,
          recipientMlKemBytes
        );
      }

      const usePubKey = typeof recipientPublicKey === "object" && "userPublicKey" in recipientPublicKey
        ? recipientPublicKey.userPublicKey
        : recipientPublicKey;

      return cryptoBrowser.wrapKey(rawKey, usePubKey as any);
    },
    [context.userPublicKey, context.userMlKemPublicKey]
  );

  const unwrapKey = useCallback(
    async (
      wrappedKey: cryptoBrowser.EncryptedKeyPayload | cryptoBrowser.HybridEncryptedKeyPayload | string,
      privKey?: CryptoKey | CryptoKey[]
    ): Promise<CryptoKey> => {
      let keyToUse = privKey;
      if (!keyToUse) {
        const activeKey = await getPrivateKey();
        keyToUse = activeKey || privateKey || undefined;
      }
      if (!keyToUse) {
        throw new Error(
          "No private key available for unwrapping. Encryption might be locked."
        );
      }

      const parsed: any = typeof wrappedKey === "string" ? JSON.parse(wrappedKey) : wrappedKey;
      if (parsed && parsed.version === "hybrid-v1") {
        const mlKey = await context.getMlKemPrivateKey();
        if (!mlKey) {
          throw new Error("No ML-KEM private key available for hybrid unwrapping.");
        }
        const singleEcdhKey = Array.isArray(keyToUse) ? keyToUse[0] : keyToUse;
        return cryptoBrowser.hybridUnwrapKey(parsed, singleEcdhKey, mlKey);
      }

      return cryptoBrowser.unwrapKey(parsed, keyToUse as any);
    },
    [getPrivateKey, privateKey, context]
  );

  /**
   * Helper to decrypt wrapped data in one step.
   * Unwraps the symmetric data key using the user's private key from context,
   * then decrypts the payload with that symmetric key.
   */
  const decryptEncrypted = useCallback(
    async (
      data: any,
      wrappedKey: any
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
    decryptEncrypted,
  };
}
