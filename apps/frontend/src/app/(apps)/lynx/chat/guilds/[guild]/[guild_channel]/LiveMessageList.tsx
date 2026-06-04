"use client";

import { Badge, FileText, Link2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const MarkdownComponents: Record<string, React.FC<any>> = {
  a: ({ ...props }: any) => (
    <a
      {...props}
      className="text-primary hover:underline transition-colors font-semibold"
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
};

interface Attachment {
  url: string;
  name: string;
  contentType?: string;
}

function MessageMedia({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.contentType?.startsWith("image/");
  const isVideo = attachment.contentType?.startsWith("video/");
  const isTextFile =
    attachment.contentType?.startsWith("text/plain") ||
    attachment.name?.endsWith(".txt");
  const [textPreview, setTextPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isTextFile) {
      fetch(attachment.url)
        .then((res) => (res.ok ? res.text() : null))
        .then((text) => {
          if (text) {
            const lines = text.split("\n").slice(0, 15);
            setTextPreview(
              lines.join("\n") + (text.split("\n").length > 15 ? "\n…" : ""),
            );
          }
        })
        .catch((err) => console.error("Failed to fetch txt file:", err));
    }
  }, [attachment.url, isTextFile]);

  if (isImage) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-zinc-800/60 max-w-[340px] shadow-md hover:scale-[1.01] transition-transform duration-300">
        <Image
          src={attachment.url}
          alt={attachment.name}
          width={340}
          height={240}
          className="w-full h-auto object-contain"
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-zinc-800/60 max-w-[360px] shadow-md">
        <video
          src={attachment.url}
          controls
          autoPlay={false}
          muted
          loop
          playsInline
          className="w-full h-auto"
        />
      </div>
    );
  }

  if (isTextFile && textPreview) {
    return (
      <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden max-w-2xl shadow-inner font-mono">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
          <FileText className="size-3.5 text-primary" />
          {attachment.name}
        </div>
        <pre className="p-4 text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap overflow-x-auto no-scrollbar">
          {textPreview}
        </pre>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-800/20 text-xs font-semibold text-primary transition-all w-fit shadow-xs"
    >
      <Link2 className="size-3.5" />
      {attachment.name}
    </a>
  );
}

interface Embed {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  video?: { url: string };
  image?: { url: string };
  thumbnail?: { url: string };
  footer?: { text: string; icon_url?: string };
}

function MessageEmbed({ embed }: { embed: Embed }) {
  const embedColor = embed.color
    ? `#${embed.color.toString(16).padStart(6, "0")}`
    : "#6366f1"; // default primary indigo

  return (
    <div
      className="mt-2.5 p-4 rounded-xl border-l-[3px] bg-zinc-950/40 border border-zinc-900/50 max-w-xl space-y-2 shadow-sm font-sans"
      style={{ borderLeftColor: embedColor }}
    >
      {embed.title && (
        <h4 className="font-bold text-foreground text-sm hover:text-primary transition-colors cursor-pointer leading-tight">
          {embed.url ? (
            <a href={embed.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
              {embed.title}
              <Link2 className="size-3" />
            </a>
          ) : (
            embed.title
          )}
        </h4>
      )}
      {embed.description && (
        <div className="text-muted-foreground text-xs leading-relaxed prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {embed.description}
          </ReactMarkdown>
        </div>
      )}

      {embed.fields && embed.fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-900/40">
          {embed.fields.map((field, i: number) => (
            <div key={i} className={field.inline ? "" : "col-span-full"}>
              <div className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                {field.name}
              </div>
              <div className="text-xs text-foreground mt-0.5 font-medium">{field.value}</div>
            </div>
          ))}
        </div>
      )}

      {embed.video && (
        <div className="mt-2 rounded-xl overflow-hidden border border-zinc-800/60 max-w-[420px]">
          <video
            src={embed.video.url}
            controls
            autoPlay={false}
            muted
            loop
            className="w-full h-auto"
          />
        </div>
      )}

      {embed.image && !embed.video && (
        <div className="mt-2 rounded-xl overflow-hidden border border-zinc-800/60 max-w-[340px]">
          <Image
            src={embed.image.url}
            alt="Embed Image"
            width={340}
            height={240}
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {embed.thumbnail && !embed.image && !embed.video && (
        <div className="mt-2 rounded-xl overflow-hidden border border-zinc-800/60 max-w-[120px] shadow-sm">
          <Image
            src={embed.thumbnail.url}
            alt="Thumbnail"
            width={120}
            height={120}
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {embed.footer && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-900/40 text-[10px] text-muted-foreground/60 select-none">
          {embed.footer.icon_url && (
            <Image
              src={embed.footer.icon_url}
              alt=""
              width={14}
              height={14}
              className="size-3.5 rounded-full"
            />
          )}
          <span className="font-medium">{embed.footer.text}</span>
        </div>
      )}
    </div>
  );
}

interface Message {
  id: string;
  author: {
    avatarURL?: string;
    globalName?: string;
    username: string;
  };
  createdTimestamp: number;
  cleanContent?: string;
  attachments?: Attachment[];
  embeds?: Embed[];
}

export default function LiveMessageList({
  initialMessages,
  guildId,
  channelId,
}: {
  initialMessages: Message[];
  guildId: string;
  channelId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync with server-side updates (e.g. after sending a message)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const streamUrl = guildId
      ? `/lynx/api/chat/guilds/${guildId}/channels/${channelId}/stream`
      : `/lynx/api/chat/dms/${channelId}/stream`;

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const newMessage = JSON.parse(event.data);
        // Only add if not already in list
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [newMessage, ...prev];
        });
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [guildId, channelId]);

  return (
    <div className="space-y-4 pt-2 select-none">
      {messages && messages.length > 0 ? (
        <AnimatePresence initial={false}>
          {messages.map((message: Message) => {
            const isBot = message.author.username?.toLowerCase().includes("lynx");
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="group flex gap-4 bg-zinc-950/20 backdrop-blur-xl p-4.5 rounded-2xl border border-zinc-900/50 hover:border-zinc-800/60 hover:bg-zinc-900/10 transition-all duration-300 shadow-md relative overflow-hidden"
              >
                {/* Subtle hover background glow */}
                <div className="absolute top-0 left-0 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/8 transition-all duration-500 pointer-events-none" />

                <div className="shrink-0 pt-0.5 relative z-10">
                  <div className="size-9 rounded-full overflow-hidden border border-zinc-800/80 bg-zinc-900/50 shadow-inner group-hover:scale-105 transition-transform duration-300">
                    {message.author.avatarURL ? (
                      <Image
                        src={message.author.avatarURL}
                        alt="User Avatar"
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground font-bold bg-zinc-900">
                        {message.author.username?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5 min-w-0 relative z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "font-bold text-[13px] transition-colors cursor-pointer",
                      isBot
                        ? "text-primary hover:text-primary/80"
                        : "text-foreground hover:text-primary"
                    )}>
                      {message.author.globalName || message.author.username}
                    </span>
                    {isBot && (
                      <Badge className="bg-primary/20 hover:bg-primary/20 text-primary border border-primary/30 text-[9px] uppercase px-1.5 py-0.5 h-4.5 font-bold tracking-wider select-none shrink-0 font-sans">
                        Bot
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground/50 font-semibold font-mono">
                      {new Date(message.createdTimestamp).toLocaleString()}
                    </span>
                  </div>

                  {message.cleanContent && (
                    <div className="text-zinc-300 text-xs md:text-sm leading-relaxed prose prose-stone dark:prose-invert max-w-none prose-p:my-0 prose-pre:my-2 prose-pre:bg-zinc-950/60 prose-pre:border prose-pre:border-zinc-800/50 prose-pre:p-4 prose-pre:rounded-xl prose-pre:font-mono prose-code:text-[11px] select-text">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={MarkdownComponents}
                      >
                        {message.cleanContent}
                      </ReactMarkdown>
                    </div>
                  )}

                  {message.attachments?.map((attachment, _i) => (
                    <MessageMedia key={_i} attachment={attachment} />
                  ))}

                  {message.embeds?.map((embed, _i) => (
                    <MessageEmbed key={_i} embed={embed} />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-40">
          <div className="size-11 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-muted-foreground font-semibold">
            #
          </div>
          <p className="text-muted-foreground text-sm italic font-medium">
            No history found here
          </p>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
