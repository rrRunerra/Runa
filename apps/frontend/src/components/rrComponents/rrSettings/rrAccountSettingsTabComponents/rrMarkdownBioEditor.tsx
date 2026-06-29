import * as React from "react";
import { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Heading,
  Code,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export interface RrMarkdownBioEditorProps {
  bio: string;
  setBio: (bio: string) => void;
}

export function RrMarkdownBioEditor({
  bio,
  setBio,
}: RrMarkdownBioEditorProps): React.JSX.Element {
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (syntax: string, placeholder = ""): void => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = "";
    let newCursorPos = start;

    if (syntax === "bold") {
      replacement = `**${selectedText || placeholder || "bold text"}**`;
      newCursorPos = start + (selectedText ? replacement.length : 2);
    } else if (syntax === "italic") {
      replacement = `*${selectedText || placeholder || "italic text"}*`;
      newCursorPos = start + (selectedText ? replacement.length : 1);
    } else if (syntax === "link") {
      replacement = `[${selectedText || placeholder || "link text"}](https://example.com)`;
      newCursorPos = start + (selectedText ? replacement.length : 1);
    } else if (syntax === "code") {
      if (selectedText.includes("\n")) {
        replacement = `\`\`\`\n${selectedText || placeholder || "code block"}\n\`\`\``;
      } else {
        replacement = `\`${selectedText || placeholder || "code"}\``;
      }
      newCursorPos = start + (selectedText ? replacement.length : 1);
    } else if (syntax === "heading") {
      replacement = `\n## ${selectedText || placeholder || "Heading"}\n`;
      newCursorPos = start + replacement.length;
    } else if (syntax === "bullet") {
      replacement = `\n- ${selectedText || placeholder || "List item"}\n`;
      newCursorPos = start + replacement.length;
    } else if (syntax === "number") {
      replacement = `\n1. ${selectedText || placeholder || "List item"}\n`;
      newCursorPos = start + replacement.length;
    }

    setBio(text.substring(0, start) + replacement + text.substring(end));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex flex-col gap-0.5 pt-2 text-left">
          <CardTitle>About Me (Markdown Bio)</CardTitle>
          <CardDescription>
            Describe yourself using Markdown. Script/HTML tags are filtered.
          </CardDescription>
        </div>
        {/* Write/Preview Switcher */}
        <div className="flex border border-border rounded-lg p-0.5 bg-muted/45 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setEditorTab("write")}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer",
              editorTab === "write"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setEditorTab("preview")}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all cursor-pointer",
              editorTab === "preview"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Preview
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {editorTab === "write" ? (
          <div className="border border-border rounded-xl overflow-hidden bg-muted/25 flex flex-col">
            {/* Markdown Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/50 border-b border-border">
              <button
                type="button"
                onClick={() => insertMarkdown("bold", "bold text")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Bold"
              >
                <Bold className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("italic", "italic text")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Italic"
              >
                <Italic className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("heading", "Heading")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Heading"
              >
                <Heading className="size-3.5" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                type="button"
                onClick={() => insertMarkdown("link", "link text")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Insert Link"
              >
                <Link className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("code", "code")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Code Block"
              >
                <Code className="size-3.5" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                type="button"
                onClick={() => insertMarkdown("bullet", "List item")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Bullet List"
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("number", "List item")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Numbered List"
              >
                <ListOrdered className="size-3.5" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={4000}
              placeholder="Write a description about yourself... (supports markdown)"
              className="w-full h-36 md:h-44 p-3 bg-transparent text-xs md:text-sm text-foreground focus:outline-none placeholder:text-muted-foreground/50 resize-none font-sans"
            />
            <div className="flex justify-end px-3 py-1.5 bg-muted/30 border-t border-border text-[10px] text-muted-foreground font-semibold tabular-nums select-none">
              {bio.length} / 4000
            </div>
          </div>
        ) : (
          /* Preview Container */
          <div className="w-full h-36 md:h-44 overflow-y-auto p-3.5 border border-border bg-muted/10 rounded-xl text-xs md:text-sm text-muted-foreground leading-relaxed custom-scrollbar animate-in fade-in duration-200 text-left">
            {bio.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ ...props }) => (
                    <h1
                      className="text-sm font-black text-foreground mt-3 mb-1.5 uppercase tracking-wide"
                      {...props}
                    />
                  ),
                  h2: ({ ...props }) => (
                    <h2
                      className="text-xs font-black text-foreground mt-2.5 mb-1 uppercase tracking-wide"
                      {...props}
                    />
                  ),
                  h3: ({ ...props }) => (
                    <h3
                      className="text-[11px] font-bold text-foreground mt-2 mb-0.5 uppercase tracking-wider"
                      {...props}
                    />
                  ),
                  p: ({ ...props }) => (
                    <p
                      className="mb-2 last:mb-0 text-muted-foreground leading-relaxed"
                      {...props}
                    />
                  ),
                  ul: ({ ...props }) => (
                    <ul
                      className="list-disc pl-4 mb-2 flex flex-col gap-0.5"
                      {...props}
                    />
                  ),
                  ol: ({ ...props }) => (
                    <ol
                      className="list-decimal pl-4 mb-2 flex flex-col gap-0.5"
                      {...props}
                    />
                  ),
                  li: ({ ...props }) => (
                    <li
                      className="text-xs text-muted-foreground"
                      {...props}
                    />
                  ),
                  strong: ({ ...props }) => (
                    <strong
                      className="font-extrabold text-foreground"
                      {...props}
                    />
                  ),
                  em: ({ ...props }) => <em className="italic" {...props} />,
                  code: ({ inline, ...props }: any) =>
                    inline ? (
                      <code
                        className="bg-muted text-muted-foreground px-1 py-0.5 rounded font-mono text-[10px] border border-border"
                        {...props}
                      />
                    ) : (
                      <pre className="bg-muted border border-border p-2.5 rounded-lg overflow-x-auto my-2 font-mono text-[10px] text-muted-foreground">
                        <code {...props} />
                      </pre>
                    ),
                  a: ({ ...props }) => (
                    <a
                      className="text-primary hover:underline font-semibold"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                }}
              >
                {bio}
              </ReactMarkdown>
            ) : (
              <p className="italic text-muted-foreground/60 text-xs">
                Nothing to preview. Start writing in the edit tab.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
