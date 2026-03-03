"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
        ? "/api/lynx/chat/dms/sendMessage"
        : "/api/lynx/chat/sendMessage";
      const body = isDm
        ? { channelId, content: content.trim() } // Adapt Lynx API to handle channelId
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
    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border -mx-6 px-6 py-4 mb-4 transition-all group-scrolled:opacity-100">
      <form
        onSubmit={handleSend}
        className="relative flex items-center gap-2 max-w-4xl mx-auto"
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Message this channel..."
          className="flex-1 bg-muted border border-border rounded-lg px-4 py-2.5 text-[13px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!content.trim() || isSending}
          className="p-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary/90 text-primary-foreground transition-colors shadow-sm"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
