"use client";

import React, { useEffect, useState } from "react";
import { Mail, Shield, Zap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Page(): React.JSX.Element {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checkingAccounts, setCheckingAccounts] = useState<boolean>(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      setCheckingAccounts(false);
      return;
    }

    if (status === "authenticated" && session?.accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            router.replace("/pegasus/unified/inbox");
          } else {
            setCheckingAccounts(false);
          }
        })
        .catch((err) => {
          console.error("Failed to check accounts on landing", err);
          setCheckingAccounts(false);
        });
    } else if (status !== "loading") {
      setCheckingAccounts(false);
    }
  }, [status, session?.accessToken, router]);

  if (status === "loading" || checkingAccounts) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-background text-muted-foreground gap-3">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-xs font-medium">Entering Pegasus...</span>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-background p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-lg w-full p-10 rounded-3xl border border-border bg-card/80 backdrop-blur-2xl shadow-2xl flex flex-col items-center text-center space-y-8"
      >
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: 0.2,
          }}
          className="relative size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(var(--primary),0.15)]"
        >
          <Mail className="size-10" strokeWidth={1.5} />

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-2xl border border-dashed border-primary/30"
          />
        </motion.div>

        <div className="space-y-3">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold tracking-tight text-foreground"
          >
            Welcome to Pegasus
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto"
          >
            A premium, end-to-end secure mail workspace. Experience unparalleled speed and aesthetics.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-border/60"
        >
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 border border-border/60">
            <Shield className="size-5 text-emerald-500" />
            <span className="text-xs font-semibold text-foreground">Secure IMAP</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 border border-border/60">
            <Zap className="size-5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Lightning Fast</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[11px] text-muted-foreground pt-2"
        >
          Configure accounts via <strong className="text-foreground font-semibold">Settings &gt; Mail Accounts</strong>
        </motion.div>
      </motion.div>
    </div>
  );
}
