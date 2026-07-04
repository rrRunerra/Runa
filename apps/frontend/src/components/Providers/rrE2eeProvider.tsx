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

interface RRe2eeContextValue {
  isE2eeUnlocked: boolean;
  isKeysExist: boolean;
  privateKey: CryptoKey | null;
  showUnlockDialog: boolean;
  setShowUnlockDialog: (show: boolean) => void;
  getPrivateKey: () => Promise<CryptoKey | null>;
  lockE2ee: () => void;
  unlockE2ee: (password: string) => Promise<void>;
}

const RRe2eeContext = createContext<RRe2eeContextValue | null>(null);

export function useRRe2ee() {
  const context = useContext(RRe2eeContext);
  if (!context) {
    throw new Error("useRRe2ee must be used within an RRe2eeProvider");
  }
  return context;
}

// --- Provider ---

export function RrE2eeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const [isE2eeUnlocked, setIsE2eeUnlocked] = useState<boolean>(false);
  const [isKeysExist, setIsKeysExist] = useState<boolean>(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState<boolean>(false);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);

  const prevUsernameRef = useRef<string | null>(null);

  // Handle auto-clearing keys on logout for multi-user support
  useEffect(() => {
    if (status === "authenticated" && session?.user?.username) {
      prevUsernameRef.current = session.user.username;
    } else if (status === "unauthenticated" && prevUsernameRef.current) {
      // User logged out, clear their key from IndexedDB
      removeKey(`private_key_${prevUsernameRef.current}`).catch(console.error);
      removeKey(`public_key_string_${prevUsernameRef.current}`).catch(
        console.error,
      );
      prevUsernameRef.current = null;
      setPrivateKey(null);
      setIsE2eeUnlocked(false);
      setIsKeysExist(false);
    }
  }, [status, session]);

  // Fetch E2EE keys with SWR
  const e2eKeysUrl =
    session?.accessToken && session?.user?.username
      ? `${process.env.NEXT_PUBLIC_API_URL}/users/me/e2ee-keys`
      : null;

  const { data: e2eKeysData, mutate: refetchE2eKeys } = useSWR<{
    userPublicKey?: string;
    encryptedUserPrivateKey?: string;
  }>(
    e2eKeysUrl ? [e2eKeysUrl, session?.accessToken] : null,
    fetcher
  );

  // Initial Check via useFetch data changes
  useEffect(() => {
    if (!session?.user?.username || !e2eKeysData) return;

    const checkKeys = async () => {
      try {
        const serverPublicKey = e2eKeysData.userPublicKey;

        if (serverPublicKey) {
          setIsKeysExist(true);
          const storedKey = await loadKey(
            `private_key_${session.user.username}`,
          );

          if (storedKey) {
            const storedPubKeyStr = await loadKey(
              `public_key_string_${session.user.username}`,
            );

            if (storedPubKeyStr === serverPublicKey) {
              setPrivateKey(storedKey);
              setIsE2eeUnlocked(true);
              setShowUnlockDialog(false);
              return;
            }

            // If the local key is invalid/mismatched or we don't have the pub key, remove it.
            await removeKey(`private_key_${session.user.username}`);
            await removeKey(`public_key_string_${session.user.username}`);
            setPrivateKey(null);
          }

          setIsE2eeUnlocked(false);
          // Only show unlock dialog if NOT dismissed by user for this page load session
          const isDismissed = localStorage.getItem(`runa-e2ee-dismissed-${session.user.username}`) === "true";
          if (!isDismissed) {
            setShowUnlockDialog(true);
          }
        } else {
          setIsKeysExist(false);
          setIsE2eeUnlocked(false);
          
          // Only show unlock dialog if NOT dismissed by user for this page load session
          const isDismissed = localStorage.getItem(`runa-e2ee-dismissed-${session.user.username}`) === "true";
          if (!isDismissed) {
            setShowUnlockDialog(true);
          }
          await removeKey(`private_key_${session.user.username}`);
          await removeKey(`public_key_string_${session.user.username}`);
          setPrivateKey(null);
        }
      } catch (err) {
        console.error("Failed to check E2EE keys:", err);
      }
    };

    checkKeys();
  }, [e2eKeysData, session?.user?.username]);

  // Listen for the login page firing runa-e2ee-unlocked after saving keys to IndexedDB
  useEffect(() => {
    const handleUnlocked = async () => {
      if (!session?.user?.username) return;
      try {
        const storedKey = await loadKey(`private_key_${session.user.username}`);
        const storedPubKeyStr = await loadKey(`public_key_string_${session.user.username}`);
        if (storedKey && storedPubKeyStr) {
          setPrivateKey(storedKey as CryptoKey);
          setIsE2eeUnlocked(true);
          setIsKeysExist(true);
          setShowUnlockDialog(false);
        }
      } catch (err) {
        console.error("Failed to auto-unlock E2EE after login:", err);
      }
    };
    window.addEventListener("runa-e2ee-unlocked", handleUnlocked);
    return () => window.removeEventListener("runa-e2ee-unlocked", handleUnlocked);
  }, [session?.user?.username]);

  const unlockE2ee = async (passwordInput: string) => {
    if (!passwordInput || !session?.user?.username || !session?.accessToken) return;

    const {
      deriveMasterKey,
      generateKeyPair,
      exportPublicKey,
      encryptData,
      decryptData,
    } = await import("@runa/crypto/browser");

    const masterKey = await deriveMasterKey(passwordInput, session.user.username);
    let importedPrivateKey: CryptoKey;

    let userPublicKeyBase64ToSave = "";

    if (!isKeysExist) {
      // Create user keypair
      const userKeyPair = await generateKeyPair();
      const userPublicKeyBase64 = await exportPublicKey(
        userKeyPair.publicKey,
      );
      userPublicKeyBase64ToSave = userPublicKeyBase64;
      const userPrivateKeyJwk = await window.crypto.subtle.exportKey(
        "jwk",
        userKeyPair.privateKey,
      );
      const userPrivateKeyStr = JSON.stringify(userPrivateKeyJwk);

      // Encrypt private key using masterKey
      const encryptedPrivate = await encryptData(
        userPrivateKeyStr,
        masterKey,
      );

      // Upload to server
      const putRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/e2ee-keys`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            userPublicKey: userPublicKeyBase64,
            encryptedUserPrivateKey: JSON.stringify(encryptedPrivate),
          }),
        },
      );
      if (!putRes.ok) throw new Error("Failed to store E2EE keys on server");

      importedPrivateKey = await window.crypto.subtle.importKey(
        "jwk",
        userPrivateKeyJwk,
        { name: "ECDH", namedCurve: "P-256" },
        false, // extractable: false for security in IndexedDB
        ["deriveKey", "deriveBits"],
      );

      // Refetch from server using useFetch to sync keys data
      refetchE2eKeys();

      toast.success("Encryption initialized!");
    } else {
      // Get keys from useFetch data
      if (!e2eKeysData) throw new Error("E2EE keys data not loaded");

      userPublicKeyBase64ToSave = e2eKeysData.userPublicKey || "";

      if (e2eKeysData.encryptedUserPrivateKey) {
        const encryptedPrivate = JSON.parse(e2eKeysData.encryptedUserPrivateKey);
        const userPrivateKeyStr = await decryptData(
          encryptedPrivate.ciphertext,
          encryptedPrivate.iv,
          masterKey,
        );

        const jwk = JSON.parse(userPrivateKeyStr);
        importedPrivateKey = await window.crypto.subtle.importKey(
          "jwk",
          jwk,
          { name: "ECDH", namedCurve: "P-256" },
          false, // extractable: false for security in IndexedDB
          ["deriveKey", "deriveBits"],
        );

        toast.success("Encryption unlocked successfully!");
      } else {
        throw new Error("No private key found on server");
      }
    }

    await saveKey(`private_key_${session.user.username}`, importedPrivateKey);
    if (userPublicKeyBase64ToSave) {
      await saveKey(
        `public_key_string_${session.user.username}`,
        userPublicKeyBase64ToSave,
      );
    }
    setPrivateKey(importedPrivateKey);
    setIsE2eeUnlocked(true);
    setShowUnlockDialog(false);

    // Clear dismissal state since E2EE is now unlocked
    localStorage.removeItem(`runa-e2ee-dismissed-${session.user.username}`);

    window.dispatchEvent(new CustomEvent("runa-e2ee-unlocked"));
  };

  const lockE2ee = useCallback(async () => {
    if (session?.user?.username) {
      await removeKey(`private_key_${session.user.username}`);
      await removeKey(`public_key_string_${session.user.username}`);
      // Clear dismissal state when user manually locks E2EE
      localStorage.removeItem(`runa-e2ee-dismissed-${session.user.username}`);
    }
    setPrivateKey(null);
    setIsE2eeUnlocked(false);
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

  return (
    <RRe2eeContext.Provider
      value={{
        isE2eeUnlocked,
        isKeysExist,
        privateKey,
        showUnlockDialog,
        setShowUnlockDialog,
        getPrivateKey,
        lockE2ee,
        unlockE2ee,
      }}
    >
      {children}
    </RRe2eeContext.Provider>
  );
}
