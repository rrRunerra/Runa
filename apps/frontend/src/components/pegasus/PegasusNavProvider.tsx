"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Lock, Shield, Loader2 } from "lucide-react";
import AppSideBar from "@/components/AppSideBar";
import { getPegasusSidebarConfig } from "../../../config/pegasusSidebarConfig";
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

interface PegasusNavProviderProps {
  children: React.ReactNode;
}

export default function PegasusNavProvider({
  children,
}: PegasusNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);

  // E2EE States
  const [isE2eeUnlocked, setIsE2eeUnlocked] = useState<boolean>(true);
  const [showUnlockDialog, setShowUnlockDialog] = useState<boolean>(false);
  const [isKeysExist, setIsKeysExist] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [unlockLoading, setUnlockLoading] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string>("");

  const fetchEmailAccounts = (): void => {
    if (session?.accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch email accounts");
          return res.json();
        })
        .then((data) => setEmailAccounts(Array.isArray(data) ? data : []))
        .catch((err) =>
          console.error("Failed to fetch email accounts in sidebar", err),
        );
    }
  };

  useEffect(() => {
    fetchEmailAccounts();

    const handleSidebarChanged = (): void => {
      fetchEmailAccounts();
    };

    window.addEventListener("runa-sidebar-changed", handleSidebarChanged);
    return () => {
      window.removeEventListener("runa-sidebar-changed", handleSidebarChanged);
    };
  }, [session?.accessToken]);

  // Check E2EE state on mount
  useEffect(() => {
    if (!session?.accessToken) return;

    const storedKey = localStorage.getItem("runa_user_private_key");
    if (storedKey) {
      setIsE2eeUnlocked(true);
      setShowUnlockDialog(false);
      return;
    }

    // Verify if E2EE keys exist on the server for the user
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/e2e-keys`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setIsKeysExist(!!data.userPublicKey);
        setIsE2eeUnlocked(false);
        setShowUnlockDialog(true);
      })
      .catch((err) => console.error("Failed to check E2EE keys:", err));
  }, [session?.accessToken]);

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
      } = await import("@/lib/crypto");

      const masterKey = await deriveMasterKey(password, session.user.username);

      if (!isKeysExist) {
        // Create user keypair
        const userKeyPair = await generateKeyPair();
        const userPublicKeyBase64 = await exportPublicKey(
          userKeyPair.publicKey,
        );
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

        localStorage.setItem("runa_user_private_key", userPrivateKeyStr);
        toast.success("E2EE secure mail mailbox created!");
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

        if (e2eKeys.encryptedUserPrivateKey) {
          const encryptedPrivate = JSON.parse(e2eKeys.encryptedUserPrivateKey);
          const userPrivateKeyStr = await decryptData(
            encryptedPrivate.ciphertext,
            encryptedPrivate.iv,
            masterKey,
          );

          localStorage.setItem("runa_user_private_key", userPrivateKeyStr);
          toast.success("Secure mailbox unlocked successfully!");
        } else {
          throw new Error("No private key found on server");
        }
      }

      setIsE2eeUnlocked(true);
      setShowUnlockDialog(false);
      setPassword("");

      // Dispatch an event to notify folder views that keys are ready!
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

  const navConfig = useMemo(
    () => getPegasusSidebarConfig(session, emailAccounts),
    [session, emailAccounts],
  );

  return (
    <>
      <AppSideBar navConfig={navConfig} />
      {children}

      <Dialog
        open={showUnlockDialog}
        onOpenChange={(open) => !unlockLoading && setShowUnlockDialog(open)}
      >
        <DialogContent className="max-w-md bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/80 shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b border-zinc-800/40">
            <DialogTitle className="flex items-center gap-2 text-md font-bold text-foreground">
              <Shield className="size-5 text-primary" />
              {isKeysExist ? "Unlock Secure Mailbox" : "Setup Secure Mailbox"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {isKeysExist
                ? "Enter your account password to decrypt your E2E secure email private key."
                : "Enter your account password to initialize your E2E secure email keys."}
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
                    {isKeysExist ? "Unlock Mailbox" : "Initialize E2EE"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
