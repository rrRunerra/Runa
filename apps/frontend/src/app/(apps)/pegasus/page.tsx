"use client";

import React from "react";
import { Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function Page(): React.JSX.Element {
  return (
    <div className="p-6 md:p-8 space-y-6 flex flex-col items-center justify-center min-h-[70vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full p-8 rounded-3xl border border-zinc-800 bg-zinc-950/20 backdrop-blur-md text-center space-y-4"
      >
        <div className="mx-auto size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Mail className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Pegasus Mail</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Welcome to Pegasus. A premium, end-to-end secure mail workspace. Click on your profile dropdown and select **Settings &gt Mail Accounts** to configure your Thunderbird-style SMTP/IMAP credentials.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
