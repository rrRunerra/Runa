"use client";

import * as React from "react";
import { HelpCircle, Copy, Check, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RrMarkdownBioPreview } from "./rrMarkdownBioPreview";

export interface RrMarkdownHelpModalProps {
  onInsertSyntax?: (syntax: string) => void;
  trigger?: React.ReactNode;
}

const MARKDOWN_GUIDE_ITEMS = [
  {
    category: "Headings",
    items: [
      { label: "Heading 1", syntax: "# Heading 1" },
      { label: "Heading 2", syntax: "## Heading 2" },
      { label: "Heading 3", syntax: "### Heading 3" },
    ],
  },
  {
    category: "Text Formatting",
    items: [
      { label: "Bold", syntax: "**Bold text**" },
      { label: "Italic", syntax: "*Italic text*" },
      { label: "Bold & Italic", syntax: "***Bold and italic***" },
      { label: "Inline Code", syntax: "`const app = true;`" },
    ],
  },
  {
    category: "Custom Colors",
    items: [
      { label: "Hex Color", syntax: "[Red Text]{#ef4444}" },
      { label: "Blue Text", syntax: "[Blue Text]{#3b82f6}" },
      { label: "Emerald Text", syntax: "[Green Text]{#10b981}" },
      { label: "Named Color", syntax: "[Purple Text]{purple}" },
    ],
  },
  {
    category: "Lists & Dividers",
    items: [
      { label: "Bullet List", syntax: "- Item 1\n- Item 2" },
      { label: "Numbered List", syntax: "1. First item\n2. Second item" },
      { label: "Horizontal Divider", syntax: "---\n" },
    ],
  },
  {
    category: "Links, Images & Quotes",
    items: [
      { label: "Hyperlink", syntax: "[Visit Runa](https://runerra.org)" },
      {
        label: "Image Embed",
        syntax: "![Artwork](https://example.com/art.png)",
      },
      { label: "Blockquote", syntax: "> This is a blockquote note." },
    ],
  },
  {
    category: "Code Blocks & Tables",
    items: [
      { label: "Code Block", syntax: "```ts\nconst name = 'Runa';\n```" },
      {
        label: "Table",
        syntax: "| Feature | Status |\n| --- | --- |\n| Markdown | Active |",
      },
    ],
  },
];

export function RrMarkdownHelpModal({
  onInsertSyntax,
  trigger,
}: RrMarkdownHelpModalProps): React.JSX.Element {
  const [copiedSyntax, setCopiedSyntax] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  const handleCopy = (syntax: string) => {
    navigator.clipboard.writeText(syntax);
    setCopiedSyntax(syntax);
    setTimeout(() => setCopiedSyntax(null), 1500);
  };

  const handleInsert = (syntax: string) => {
    if (onInsertSyntax) {
      onInsertSyntax(syntax);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            title="Markdown Formatting Help"
          >
            <HelpCircle className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[70vw] sm:max-w-[70vw] max-w-[70vw] h-[75vh] max-h-205 flex flex-col overflow-hidden p-0 gap-0 border-border/80 shadow-2xl">
        <DialogHeader className="p-5 border-b border-border/60 shrink-0 bg-muted/20">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <HelpCircle className="size-5 text-primary" />
            Markdown Formatting Guide
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Format your bio using standard CommonMark, GFM tables, embeds, and
            custom text colors.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {MARKDOWN_GUIDE_ITEMS.map((section) => (
            <div key={section.category} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/80 border-b border-border/40 pb-1.5">
                {section.category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(item.syntax)}
                          className="size-6 text-muted-foreground hover:text-foreground"
                          title="Copy syntax"
                        >
                          {copiedSyntax === item.syntax ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </Button>
                        {onInsertSyntax && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleInsert(item.syntax)}
                            className="h-6 px-2 text-[10px] font-bold cursor-pointer"
                          >
                            <Plus className="size-3 mr-1" />
                            Insert
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="bg-muted/60 p-2 rounded-lg border border-border/40 font-mono text-[11px] text-muted-foreground overflow-x-auto select-all">
                      {item.syntax}
                    </div>

                    <div className="mt-1 pt-1 border-t border-border/30">
                      <span className="text-[10px] text-muted-foreground/70 font-semibold block mb-0.5">
                        Preview:
                      </span>
                      <RrMarkdownBioPreview content={item.syntax} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
