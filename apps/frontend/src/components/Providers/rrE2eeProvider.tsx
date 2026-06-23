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
import { Lock, Shield, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

export function rrE2eeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const [isE2eeUnlocked, setIsE2eeUnlocked] = useState<boolean>(false);
  const [isKeysExist, setIsKeysExist] = useState<boolean>(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState<boolean>(false);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [password, setPassword] = useState<string>("");
  const [unlockLoading, setUnlockLoading] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string>("");

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

  // Initial Check
  useEffect(() => {
    if (!session?.accessToken || !session?.user?.username) return;

    const checkKeys = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user/e2e-keys`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          },
        );
        if (!res.ok) throw new Error("Failed to check E2EE keys");
        const data = await res.json();
        const serverPublicKey = data.userPublicKey;

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
          setShowUnlockDialog(true);
        } else {
          setIsKeysExist(false);
          setIsE2eeUnlocked(false);
          setShowUnlockDialog(true);
          await removeKey(`private_key_${session.user.username}`);
          await removeKey(`public_key_string_${session.user.username}`);
          setPrivateKey(null);
        }
      } catch (err) {
        console.error("Failed to check E2EE keys:", err);
      }
    };

    checkKeys();
  }, [session?.accessToken, session?.user?.username]);

  const handleUnlockE2ee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !session?.user?.username || !session?.accessToken) return;
    setUnlockLoading(true);
    setUnlockError("");

    try {
      const {
        deriveMasterKey,
        generateKeyPair,
        exportPublicKey,
        encryptData,
        decryptData,
      } = await import("@runa/crypto/browser");

      const masterKey = await deriveMasterKey(password, session.user.username);
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
          `${process.env.NEXT_PUBLIC_API_URL}/user/e2e-keys`,
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

        toast.success("E2EE secure storage initialized!");
      } else {
        // Get keys from server
        const getRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user/e2e-keys`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          },
        );
        if (!getRes.ok) throw new Error("Failed to retrieve E2EE keys");
        const e2eKeys = await getRes.json();

        userPublicKeyBase64ToSave = e2eKeys.userPublicKey;

        if (e2eKeys.encryptedUserPrivateKey) {
          const encryptedPrivate = JSON.parse(e2eKeys.encryptedUserPrivateKey);
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

          toast.success("Secure storage unlocked successfully!");
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
      setPassword("");

      window.dispatchEvent(new CustomEvent("runa-e2ee-unlocked"));
    } catch (err: any) {
      console.error(err);
      setUnlockError(
        isKeysExist
          ? "Incorrect password. Failed to unlock."
          : "Failed to initialize keys.",
      );
    } finally {
      setUnlockLoading(false);
    }
  };

  const lockE2ee = useCallback(async () => {
    if (session?.user?.username) {
      await removeKey(`private_key_${session.user.username}`);
      await removeKey(`public_key_string_${session.user.username}`);
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
      }}
    >
      {children}
      <Dialog
        open={showUnlockDialog}
        onOpenChange={(open) => !unlockLoading && setShowUnlockDialog(open)}
      >
        <DialogContent className="max-w-md bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-zinc-800/40">
            <DialogTitle className="flex items-center gap-2 text-md font-bold text-foreground">
              <Shield className="size-5 text-primary" />
              {isKeysExist ? "Unlock Secure Storage" : "Setup Secure Storage"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {isKeysExist
                ? "Enter your account password to decrypt your E2E secure private key."
                : "Enter your account password to initialize your E2E secure keys for Chats, Emails, and Files."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUnlockE2ee} className="space-y-4 pt-3">
            <div className="space-y-2">
              <Label
                htmlFor="e2ee-password"
                className="text-xs text-muted-foreground"
              >
                Account Password
              </Label>
              <div className="relative">
                <Input
                  id="e2ee-password"
                  type="password"
                  placeholder="Enter account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={unlockLoading}
                  className="h-10 bg-zinc-900 border-zinc-800 rounded-lg text-xs"
                  required
                />
              </div>
            </div>

            {unlockError && (
              <p className="text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                {unlockError}
              </p>
            )}

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={unlockLoading || !password}
                className="h-9 px-5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg"
              >
                {unlockLoading ? (
                  <>
                    <Loader2 className="size-3.5 mr-2 animate-spin" />
                    {isKeysExist ? "Decrypting..." : "Setting up..."}
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5 mr-1.5" />
                    {isKeysExist ? "Unlock Storage" : "Initialize E2EE"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </RRe2eeContext.Provider>
  );
}
