"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { saveKey, loadKey, removeKey } from "@/lib/indexeddb";

// --- Context & Types ---

export interface RrCryptoContextValue {
  isEncryptionUnlocked: boolean;
  isKeysExist: boolean;
  privateKey: CryptoKey | null;
  mlKemPrivateKey: Uint8Array | null;
  userPublicKey: string | null;
  userMlKemPublicKey: string | null;
  showUnlockDialog: boolean;
  setShowUnlockDialog: (show: boolean) => void;
  getPrivateKey: () => Promise<CryptoKey | null>;
  getMlKemPrivateKey: () => Promise<Uint8Array | null>;
  lockEncryption: () => void;
  unlockEncryption: (password: string) => Promise<void>;
}

const RrCryptoContext = createContext<RrCryptoContextValue | null>(null);

export function useRrCryptoContext() {
  const context = useContext(RrCryptoContext);
  if (!context) {
    throw new Error("useRrCryptoContext must be used within an RrCryptoProvider");
  }
  return context;
}

// --- Provider ---

export function RrCryptoProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const [isEncryptionUnlocked, setIsEncryptionUnlocked] = useState<boolean>(false);
  const [isKeysExist, setIsKeysExist] = useState<boolean>(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState<boolean>(false);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [mlKemPrivateKey, setMlKemPrivateKey] = useState<Uint8Array | null>(null);
  const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
  const [userMlKemPublicKey, setUserMlKemPublicKey] = useState<string | null>(null);

  const prevUsernameRef = useRef<string | null>(null);

  // Handle auto-clearing keys on logout for multi-user support
  useEffect(() => {
    if (status === "authenticated" && session?.user?.username) {
      prevUsernameRef.current = session.user.username;
    } else if (status === "unauthenticated" && prevUsernameRef.current) {
      // User logged out, clear their keys from IndexedDB
      removeKey(`private_key_${prevUsernameRef.current}`).catch(console.error);
      removeKey(`mlkem_key_${prevUsernameRef.current}`).catch(console.error);
      removeKey(`public_key_string_${prevUsernameRef.current}`).catch(
        console.error,
      );
      removeKey(`mlkem_public_key_string_${prevUsernameRef.current}`).catch(
        console.error,
      );
      prevUsernameRef.current = null;
      setPrivateKey(null);
      setMlKemPrivateKey(null);
      setUserPublicKey(null);
      setUserMlKemPublicKey(null);
      setIsEncryptionUnlocked(false);
      setIsKeysExist(false);
    }
  }, [status, session]);

  // Fetch Encryption keys with SWR
  const encryptionKeysUrl =
    session?.accessToken && session?.user?.username
      ? `${process.env.NEXT_PUBLIC_API_URL}/users/me/encryption-keys`
      : null;

  const { data: encryptionKeysData, mutate: refetchEncryptionKeys } = useSWR<{
    userPublicKey?: string;
    userMlKemPublicKey?: string;
    encryptedUserPrivateKey?: string;
  }>(
    encryptionKeysUrl ? [encryptionKeysUrl, session?.accessToken] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  // Initial Check via useFetch data changes
  useEffect(() => {
    if (!session?.user?.username || !encryptionKeysData) return;

    const checkKeys = async () => {
      try {
        const serverPublicKey = encryptionKeysData.userPublicKey;
        const serverMlKemPublicKey = encryptionKeysData.userMlKemPublicKey;

        if (serverPublicKey) {
          setIsKeysExist(true);
          const storedKey = await loadKey(
            `private_key_${session.user.username}`,
          );
          const storedMlKemKey = await loadKey(
            `mlkem_key_${session.user.username}`,
          );

          if (storedKey && storedMlKemKey) {
            const storedPubKeyStr = await loadKey(
              `public_key_string_${session.user.username}`,
            );
            const storedMlKemPubKeyStr = await loadKey(
              `mlkem_public_key_string_${session.user.username}`,
            );

            if (storedPubKeyStr === serverPublicKey) {
              setPrivateKey(storedKey);
              setMlKemPrivateKey(storedMlKemKey as Uint8Array);
              setUserPublicKey(storedPubKeyStr as string);
              setUserMlKemPublicKey(storedMlKemPubKeyStr as string || null);
              setIsEncryptionUnlocked(true);
              setShowUnlockDialog(false);
              return;
            }

            // If the local key is invalid/mismatched or we don't have the pub key, remove it.
            await removeKey(`private_key_${session.user.username}`);
            await removeKey(`mlkem_key_${session.user.username}`);
            await removeKey(`public_key_string_${session.user.username}`);
            await removeKey(`mlkem_public_key_string_${session.user.username}`);
            setPrivateKey(null);
            setMlKemPrivateKey(null);
            setUserPublicKey(null);
            setUserMlKemPublicKey(null);
          }

          setIsEncryptionUnlocked(false);
          // Only show unlock dialog if NOT dismissed by user for this page load session
          const isDismissed = localStorage.getItem(`runa-encryption-dismissed-${session.user.username}`) === "true";
          if (!isDismissed) {
            setShowUnlockDialog(true);
          }
        } else {
          setIsKeysExist(false);
          setIsEncryptionUnlocked(false);
          
          // Only show unlock dialog if NOT dismissed by user for this page load session
          const isDismissed = localStorage.getItem(`runa-encryption-dismissed-${session.user.username}`) === "true";
          if (!isDismissed) {
            setShowUnlockDialog(true);
          }
          await removeKey(`private_key_${session.user.username}`);
          await removeKey(`mlkem_key_${session.user.username}`);
          await removeKey(`public_key_string_${session.user.username}`);
          await removeKey(`mlkem_public_key_string_${session.user.username}`);
          setPrivateKey(null);
          setMlKemPrivateKey(null);
          setUserPublicKey(null);
          setUserMlKemPublicKey(null);
        }
      } catch (err) {
        console.error("Failed to check encryption keys:", err);
      }
    };

    checkKeys();
  }, [encryptionKeysData, session?.user?.username]);

  // Listen for the login page firing runa-encryption-unlocked after saving keys to IndexedDB
  useEffect(() => {
    const handleUnlocked = async () => {
      if (!session?.user?.username) return;
      try {
        const storedKey = await loadKey(`private_key_${session.user.username}`);
        const storedMlKemKey = await loadKey(`mlkem_key_${session.user.username}`);
        const storedPubKeyStr = await loadKey(`public_key_string_${session.user.username}`);
        const storedMlKemPubKeyStr = await loadKey(`mlkem_public_key_string_${session.user.username}`);
        if (storedKey && storedMlKemKey && storedPubKeyStr) {
          setPrivateKey(storedKey as CryptoKey);
          setMlKemPrivateKey(storedMlKemKey as Uint8Array);
          setUserPublicKey(storedPubKeyStr as string);
          setUserMlKemPublicKey(storedMlKemPubKeyStr as string || null);
          setIsEncryptionUnlocked(true);
          setIsKeysExist(true);
          setShowUnlockDialog(false);
        }
      } catch (err) {
        console.error("Failed to auto-unlock encryption after login:", err);
      }
    };
    window.addEventListener("runa-encryption-unlocked", handleUnlocked);
    return () => window.removeEventListener("runa-encryption-unlocked", handleUnlocked);
  }, [session?.user?.username]);

  const unlockEncryption = async (passwordInput: string) => {
    if (!passwordInput || !session?.user?.username || !session?.accessToken) return;

    const {
      deriveMasterKey,
      generateKeyPair,
      exportPublicKey,
      encryptData,
      decryptData,
      generateMlKemKeyPair,
      bufferToBase64Url,
      base64UrlToBuffer,
    } = await import("@runa/crypto/browser");

    const masterKey = await deriveMasterKey(passwordInput, session.user.username);
    let importedPrivateKey: CryptoKey;
    let importedMlKemPrivateKey: Uint8Array | null = null;

    let userPublicKeyBase64ToSave = "";
    let userMlKemPublicKeyBase64ToSave = "";

    if (!isKeysExist) {
      // Create user keypair (ECDH)
      const userKeyPair = await generateKeyPair();
      const userPublicKeyBase64 = await exportPublicKey(
        userKeyPair.publicKey,
      );
      userPublicKeyBase64ToSave = userPublicKeyBase64;
      const userPrivateKeyJwk = await window.crypto.subtle.exportKey(
        "jwk",
        userKeyPair.privateKey,
      );

      // Create user keypair (ML-KEM)
      const mlKemKeyPair = await generateMlKemKeyPair();
      const userMlKemPublicKeyBase64 = bufferToBase64Url(
        mlKemKeyPair.publicKey.buffer.slice(
          mlKemKeyPair.publicKey.byteOffset,
          mlKemKeyPair.publicKey.byteOffset + mlKemKeyPair.publicKey.byteLength
        ) as ArrayBuffer
      );
      userMlKemPublicKeyBase64ToSave = userMlKemPublicKeyBase64;

      const userMlKemPrivateKeyBase64 = bufferToBase64Url(
        mlKemKeyPair.secretKey.buffer.slice(
          mlKemKeyPair.secretKey.byteOffset,
          mlKemKeyPair.secretKey.byteOffset + mlKemKeyPair.secretKey.byteLength
        ) as ArrayBuffer
      );

      // Package both private keys together
      const keysPackage = {
        ecdhJwk: userPrivateKeyJwk,
        mlkemSecretKey: userMlKemPrivateKeyBase64
      };

      // Encrypt private keys package using masterKey
      const encryptedPrivate = await encryptData(
        JSON.stringify(keysPackage),
        masterKey,
      );

      // Upload to server
      const putRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/encryption-keys`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            userPublicKey: userPublicKeyBase64,
            userMlKemPublicKey: userMlKemPublicKeyBase64,
            encryptedUserPrivateKey: JSON.stringify(encryptedPrivate),
          }),
        },
      );
      if (!putRes.ok) throw new Error("Failed to store encryption keys on server");

      importedPrivateKey = await window.crypto.subtle.importKey(
        "jwk",
        userPrivateKeyJwk,
        { name: "ECDH", namedCurve: "P-256" },
        false, // extractable: false for security in IndexedDB
        ["deriveKey", "deriveBits"],
      );
      importedMlKemPrivateKey = mlKemKeyPair.secretKey;

      // Refetch from server using useFetch to sync keys data
      refetchEncryptionKeys();

      toast.success("Encryption initialized!");
    } else {
      // Get keys from useFetch data
      if (!encryptionKeysData) throw new Error("Encryption keys data not loaded");

      userPublicKeyBase64ToSave = encryptionKeysData.userPublicKey || "";
      userMlKemPublicKeyBase64ToSave = encryptionKeysData.userMlKemPublicKey || "";

      if (encryptionKeysData.encryptedUserPrivateKey) {
        const encryptedPrivate = JSON.parse(encryptionKeysData.encryptedUserPrivateKey);
        const privateKeysStr = await decryptData(
          encryptedPrivate.ciphertext,
          encryptedPrivate.iv,
          masterKey,
        );

        const keysPackage = JSON.parse(privateKeysStr);
        let ecdhJwk: any;
        let mlkemSecretKeyBase64: string | null = null;

        if (keysPackage && typeof keysPackage === "object" && "ecdhJwk" in keysPackage) {
          ecdhJwk = keysPackage.ecdhJwk;
          mlkemSecretKeyBase64 = keysPackage.mlkemSecretKey || null;
        } else {
          ecdhJwk = keysPackage; // Plain JWK
        }

        importedPrivateKey = await window.crypto.subtle.importKey(
          "jwk",
          ecdhJwk,
          { name: "ECDH", namedCurve: "P-256" },
          false,
          ["deriveKey", "deriveBits"],
        );

        if (mlkemSecretKeyBase64) {
          importedMlKemPrivateKey = new Uint8Array(base64UrlToBuffer(mlkemSecretKeyBase64));
        } else {
          // Upgrade on the fly: generate ML-KEM keys
          const mlKemKeyPair = await generateMlKemKeyPair();
          const userMlKemPublicKeyBase64 = bufferToBase64Url(
            mlKemKeyPair.publicKey.buffer.slice(
              mlKemKeyPair.publicKey.byteOffset,
              mlKemKeyPair.publicKey.byteOffset + mlKemKeyPair.publicKey.byteLength
            ) as ArrayBuffer
          );
          userMlKemPublicKeyBase64ToSave = userMlKemPublicKeyBase64;
          importedMlKemPrivateKey = mlKemKeyPair.secretKey;

          const newMlKemPrivateKeyBase64 = bufferToBase64Url(
            mlKemKeyPair.secretKey.buffer.slice(
              mlKemKeyPair.secretKey.byteOffset,
              mlKemKeyPair.secretKey.byteOffset + mlKemKeyPair.secretKey.byteLength
            ) as ArrayBuffer
          );

          // Package both together
          const newKeysPackage = {
            ecdhJwk,
            mlkemSecretKey: newMlKemPrivateKeyBase64,
          };

          // Re-encrypt package
          const newEncryptedPrivate = await encryptData(
            JSON.stringify(newKeysPackage),
            masterKey,
          );

          // Update server on the fly
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/encryption-keys`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({
              userPublicKey: encryptionKeysData.userPublicKey,
              userMlKemPublicKey: userMlKemPublicKeyBase64,
              encryptedUserPrivateKey: JSON.stringify(newEncryptedPrivate),
            }),
          });
        }

        toast.success("Encryption unlocked successfully!");
      } else {
        throw new Error("No private key found on server");
      }
    }

    await saveKey(`private_key_${session.user.username}`, importedPrivateKey);
    await saveKey(`mlkem_key_${session.user.username}`, importedMlKemPrivateKey);
    if (userPublicKeyBase64ToSave) {
      await saveKey(
        `public_key_string_${session.user.username}`,
        userPublicKeyBase64ToSave,
      );
    }
    if (userMlKemPublicKeyBase64ToSave) {
      await saveKey(
        `mlkem_public_key_string_${session.user.username}`,
        userMlKemPublicKeyBase64ToSave,
      );
    }
    setPrivateKey(importedPrivateKey);
    setMlKemPrivateKey(importedMlKemPrivateKey);
    setUserPublicKey(userPublicKeyBase64ToSave);
    setUserMlKemPublicKey(userMlKemPublicKeyBase64ToSave || null);
    setIsEncryptionUnlocked(true);
    setShowUnlockDialog(false);

    // Clear dismissal state since Encryption is now unlocked
    localStorage.removeItem(`runa-encryption-dismissed-${session.user.username}`);

    window.dispatchEvent(new CustomEvent("runa-encryption-unlocked"));
  };

  const lockEncryption = useCallback(async () => {
    if (session?.user?.username) {
      await removeKey(`private_key_${session.user.username}`);
      await removeKey(`mlkem_key_${session.user.username}`);
      await removeKey(`public_key_string_${session.user.username}`);
      await removeKey(`mlkem_public_key_string_${session.user.username}`);
      // Clear dismissal state when user manually locks encryption
      localStorage.removeItem(`runa-encryption-dismissed-${session.user.username}`);
    }
    setPrivateKey(null);
    setMlKemPrivateKey(null);
    setUserPublicKey(null);
    setUserMlKemPublicKey(null);
    setIsEncryptionUnlocked(false);
    setShowUnlockDialog(true);
  }, [session?.user?.username]);

  const getPrivateKey = useCallback(async () => {
    if (privateKey) return privateKey;
    if (session?.user?.username) {
      const stored = await loadKey(`private_key_${session.user.username}`);
      if (stored) {
        setPrivateKey(stored);
        return stored;
      }
    }
    return null;
  }, [privateKey, session?.user?.username]);

  const getMlKemPrivateKey = useCallback(async () => {
    if (mlKemPrivateKey) return mlKemPrivateKey;
    if (session?.user?.username) {
      const stored = await loadKey(`mlkem_key_${session.user.username}`);
      if (stored) {
        setMlKemPrivateKey(stored as Uint8Array);
        return stored as Uint8Array;
      }
    }
    return null;
  }, [mlKemPrivateKey, session?.user?.username]);

  return (
    <RrCryptoContext.Provider
      value={{
        isEncryptionUnlocked,
        isKeysExist,
        privateKey,
        mlKemPrivateKey,
        userPublicKey,
        userMlKemPublicKey,
        showUnlockDialog,
        setShowUnlockDialog,
        getPrivateKey,
        getMlKemPrivateKey,
        lockEncryption,
        unlockEncryption,
      }}
    >
      {children}
    </RrCryptoContext.Provider>
  );
}
