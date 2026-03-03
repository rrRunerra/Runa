"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText } from "lucide-react";

const MarkdownComponents: Record<string, React.FC<any>> = {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  a: (
    { ...props }: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) => (
    <a
      {...props}
      className="text-primary hover:underline transition-colors"
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
              lines.join("\n") + (text.split("\n").length > 15 ? "\n..." : ""),
            );
          }
        })
        .catch((err) => console.error("Failed to fetch txt file:", err));
    }
  }, [attachment.url, isTextFile]);

  if (isImage) {
    return (
      <div className="mt-1 rounded-md overflow-hidden border border-border max-w-[280px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="w-full h-auto object-contain"
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-1 rounded-md overflow-hidden border border-border max-w-[320px]">
        <video
          src={attachment.url}
          controls
          autoPlay
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
      <div className="mt-1.5 rounded-md border border-border bg-card overflow-hidden max-w-2xl">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b border-border text-[10px] text-muted-foreground font-medium font-mono">
          <FileText className="w-3 h-3 text-muted-foreground/60" />
          {attachment.name}
        </div>
        <pre className="p-3 text-[11px] text-foreground font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
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
      className="mt-1 flex items-center gap-1.5 p-1.5 rounded bg-accent/50 hover:bg-accent transition-colors w-fit text-[11px] text-primary"
    >
      <span className="opacity-70">📎</span> {attachment.name}
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
  return (
    <div
      className="mt-1.5 p-3 rounded border-l-2 bg-card/60 max-w-xl space-y-1.5 border-border"
      style={{
        borderLeftColor: embed.color
          ? `#${embed.color.toString(16).padStart(6, "0")}`
          : undefined,
      }}
    >
      {embed.title && (
        <h4 className="font-bold text-foreground text-[13px] hover:underline cursor-pointer">
          {embed.url ? (
            <a href={embed.url} target="_blank" rel="noopener noreferrer">
              {embed.title}
            </a>
          ) : (
            embed.title
          )}
        </h4>
      )}
      {embed.description && (
        <div className="text-muted-foreground text-[12px] leading-snug prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={MarkdownComponents}
          >
            {embed.description}
          </ReactMarkdown>
        </div>
      )}

      {embed.fields && embed.fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
          {embed.fields.map((field, i: number) => (
            <div key={i} className={field.inline ? "" : "col-span-full"}>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {field.name}
              </div>
              <div className="text-[12px] text-foreground">{field.value}</div>
            </div>
          ))}
        </div>
      )}

      {embed.video && (
        <div className="mt-1.5 rounded overflow-hidden border border-border max-w-[400px]">
          <video
            src={embed.video.url}
            controls
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto"
          />
        </div>
      )}

      {embed.image && !embed.video && (
        <div className="mt-1.5 rounded overflow-hidden border border-border max-w-[300px]">
          <img src={embed.image.url} alt="Embed" className="w-full h-auto" />
        </div>
      )}

      {embed.thumbnail && !embed.image && !embed.video && (
        <div className="mt-1.5 rounded overflow-hidden border border-border max-w-[150px]">
          <img
            src={embed.thumbnail.url}
            alt="Thumbnail"
            className="w-full h-auto"
          />
        </div>
      )}

      {embed.footer && (
        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border">
          {embed.footer.icon_url && (
            <img
              src={embed.footer.icon_url}
              alt=""
              className="w-3.5 h-3.5 rounded-full"
            />
          )}
          <span className="text-[9px] text-muted-foreground">
            {embed.footer.text}
          </span>
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
    // Connect to Lynx SSE stream
    const lynxApiUrl =
      process.env.NEXT_PUBLIC_LYNX_API_URL || "http://localhost:4444";
    const streamUrl = guildId
      ? `${lynxApiUrl}/guilds/${guildId}/channels/${channelId}/stream`
      : `${lynxApiUrl}/dms/${channelId}/stream`;

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
    <div className="space-y-4 pt-2">
      {messages && messages.length > 0 ? (
        messages.map((message: Message) => (
          <div
            key={message.id}
            className="group flex gap-3 hover:bg-muted/30 p-1.5 -mx-1.5 rounded transition-colors"
          >
            <div className="shrink-0 pt-0.5">
              <div className="w-8 h-8 rounded-full bg-accent/20 overflow-hidden border border-border shadow-sm">
                {message.author.avatarURL ? (
                  <img
                    src={message.author.avatarURL}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                    ?
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-0.5 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-[13px] text-foreground hover:underline cursor-pointer">
                  {message.author.globalName || message.author.username}
                </span>
                <span className="text-[9px] text-muted-foreground font-normal opacity-80">
                  {new Date(message.createdTimestamp).toLocaleString()}
                </span>
              </div>

              {message.cleanContent && (
                <div className="text-foreground text-[13px] leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-0 prose-pre:my-1 prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {message.cleanContent}
                  </ReactMarkdown>
                </div>
              )}

              {message.attachments?.map(
                (
                  attachment: any, // eslint-disable-line @typescript-eslint/no-explicit-any
                  _i: number,
                ) => (
                  <MessageMedia key={_i} attachment={attachment} />
                ),
              )}

              {message.embeds?.map(
                (
                  embed: any, // eslint-disable-line @typescript-eslint/no-explicit-any
                  _i: number,
                ) => (
                  <MessageEmbed key={_i} embed={embed} />
                ),
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 opacity-40">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-muted-foreground border border-border">
            #
          </div>
          <p className="text-muted-foreground text-sm italic">
            No history found here
          </p>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
