"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

export default function MessageInput({
  guildId,
  channelId,
}: {
  guildId: string;
  channelId: string;
}) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      const isDm = !guildId;
      const url = isDm
        ? "/lynx/api/chat/dms/sendMessage"
        : "/lynx/api/chat/sendMessage";
      const body = isDm
        ? { channelId, content: content.trim() }
        : { guild: guildId, channel: channelId, content: content.trim() };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setContent("");
        router.refresh(); // Refresh messages
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="sticky top-0 z-20 bg-zinc-950/20 backdrop-blur-xl border-b border-zinc-800/40 -mx-6 px-6 py-4 mb-4 select-none">
      <form
        onSubmit={handleSend}
        className="relative flex items-center gap-3.5 max-w-4xl mx-auto"
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message this channel…"
          className="flex-1 bg-zinc-900/30 border border-zinc-800/50 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all shadow-inner"
          disabled={isSending}
          autoComplete="off"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!content.trim() || isSending}
          className="size-9 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center transition-colors"
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </motion.button>
      </form>
    </div>
  );
}
