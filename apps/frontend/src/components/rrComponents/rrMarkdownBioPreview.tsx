"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export interface RrMarkdownBioPreviewProps {
  content?: string | null;
  emptyFallbackText?: string;
  className?: string;
}

/**
 * Preprocesses custom color syntax into safe markdown color links:
 * - [text]{#ff0000} or [text]{red} -> [text](rrcolor:hex-ff0000) or [text](rrcolor:red)
 * - <color:#ff0000>text</color> or <color:red>text</color> -> [text](rrcolor:hex-ff0000)
 * - [text](color:#ff0000) -> [text](rrcolor:hex-ff0000)
 */
function preprocessMarkdownColors(text: string): string {
  if (!text) return "";
  const encodeColor = (color: string) => {
    const clean = color.replace(/^color:\s*/i, "").trim();
    if (clean.startsWith("#")) {
      return `hex-${clean.substring(1)}`;
    }
    return clean;
  };

  return text
    // Handle [text]{color} or [text]{color:val}
    .replace(/\[([^\]]+)\]\{([^}]+)\}/g, (_, label, color) => {
      return `[${label}](rrcolor:${encodeColor(color)})`;
    })
    // Handle <color:val>text</color>
    .replace(/<color:([^>]+)>([\s\S]*?)<\/color>/gi, (_, color, label) => {
      return `[${label}](rrcolor:${encodeColor(color)})`;
    })
    // Handle [text](color:val)
    .replace(/\[([^\]]+)\]\(color:([^)]+)\)/gi, (_, label, color) => {
      return `[${label}](rrcolor:${encodeColor(color)})`;
    });
}

export function RrMarkdownBioPreview({
  content,
  emptyFallbackText = "No bio provided.",
  className,
}: RrMarkdownBioPreviewProps): React.JSX.Element {
  if (!content || !content.trim()) {
    return (
      <p className={cn("italic text-muted-foreground/60 text-xs md:text-sm", className)}>
        {emptyFallbackText}
      </p>
    );
  }

  const processedContent = preprocessMarkdownColors(content);

  return (
    <div className={cn("text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => url}
        components={{
          // Headings h1 through h6
          h1: ({ ...props }) => (
            <h1
              className="text-xl md:text-2xl font-black text-foreground mt-4 mb-2 tracking-tight border-b border-border/40 pb-1"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="text-lg md:text-xl font-bold text-foreground mt-3.5 mb-1.5 tracking-tight border-b border-border/30 pb-0.5"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="text-base md:text-lg font-bold text-foreground mt-3 mb-1"
              {...props}
            />
          ),
          h4: ({ ...props }) => (
            <h4
              className="text-sm md:text-base font-semibold text-foreground mt-2.5 mb-1"
              {...props}
            />
          ),
          h5: ({ ...props }) => (
            <h5
              className="text-xs md:text-sm font-semibold text-foreground mt-2 mb-0.5"
              {...props}
            />
          ),
          h6: ({ ...props }) => (
            <h6
              className="text-xs font-semibold text-muted-foreground mt-2 mb-0.5 uppercase tracking-wider"
              {...props}
            />
          ),

          // Paragraphs & newlines
          p: ({ ...props }) => (
            <p
              className="mb-2.5 last:mb-0 text-muted-foreground leading-relaxed whitespace-pre-wrap"
              {...props}
            />
          ),

          // Lists & items
          ul: ({ ...props }) => (
            <ul className="list-disc pl-5 mb-2.5 flex flex-col gap-1" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal pl-5 mb-2.5 flex flex-col gap-1" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="text-xs md:text-sm text-muted-foreground leading-relaxed" {...props} />
          ),

          // Text styling
          strong: ({ ...props }) => (
            <strong className="font-extrabold text-foreground" {...props} />
          ),
          em: ({ ...props }) => <em className="italic" {...props} />,

          // Blockquotes
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-primary/70 pl-3.5 py-1 my-2.5 italic text-muted-foreground bg-primary/5 rounded-r-lg"
              {...props}
            />
          ),

          // Horizontal rules
          hr: ({ ...props }) => <hr className="my-4 border-border/60" {...props} />,

          // Code blocks & inline code
          code: ({ inline, children, className: codeClassName, ...props }: any) => {
            const isInline = inline ?? !String(children).includes("\n");
            return isInline ? (
              <code
                className="bg-muted text-foreground px-1.5 py-0.5 rounded font-mono text-[11px] md:text-xs border border-border/60"
                {...props}
              >
                {children}
              </code>
            ) : (
              <pre className="bg-muted/80 border border-border/60 p-3 rounded-xl overflow-x-auto my-3 font-mono text-[11px] md:text-xs text-foreground custom-scrollbar">
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            );
          },

          // Links & Custom Colored Text Support
          a: ({ href, children, ...props }) => {
            const decodedHref = href ? decodeURIComponent(href) : "";

            if (
              decodedHref.startsWith("rrcolor:") ||
              decodedHref.startsWith("color:")
            ) {
              let rawColor = decodedHref
                .replace(/^rrcolor:/, "")
                .replace(/^color:/, "")
                .trim();

              if (rawColor.startsWith("hex-")) {
                rawColor = `#${rawColor.substring(4)}`;
              }

              return (
                <span
                  style={{ color: rawColor }}
                  className="font-bold inline"
                >
                  {children}
                </span>
              );
            }

            return (
              <a
                href={href}
                className="text-primary hover:underline font-semibold transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },

          // Images
          img: ({ src, alt, ...props }) => (
            <img
              src={src}
              alt={alt || "Bio image"}
              className="max-w-full h-auto rounded-xl border border-border/50 my-3 shadow-xs object-cover"
              loading="lazy"
              {...props}
            />
          ),

          // GFM Tables
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-3 border border-border/60 rounded-xl">
              <table className="w-full text-left border-collapse text-xs md:text-sm" {...props} />
            </div>
          ),
          thead: ({ ...props }) => <thead className="bg-muted/60 border-b border-border/60 font-bold text-foreground" {...props} />,
          tbody: ({ ...props }) => <tbody className="divide-y divide-border/40" {...props} />,
          tr: ({ ...props }) => <tr className="hover:bg-muted/30 transition-colors" {...props} />,
          th: ({ ...props }) => <th className="p-2.5 font-bold" {...props} />,
          td: ({ ...props }) => <td className="p-2.5 text-muted-foreground" {...props} />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
