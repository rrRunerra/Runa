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
  Quote,
  Image,
  Table,
  Minus,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { RrMarkdownBioPreview } from "@/components/rrComponents/rrMarkdownBioPreview";
import { RrMarkdownHelpModal } from "@/components/rrComponents/rrMarkdownHelpModal";

const COLOR_PRESETS = [
  { name: "Red", hex: "#ef4444" },
  { name: "Orange", hex: "#f97316" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "White", hex: "#ffffff" },
  { name: "Zinc", hex: "#a1a1aa" },
];

export interface RrMarkdownBioEditorProps {
  bio: string;
  setBio: (bio: string) => void;
}

export function RrMarkdownBioEditor({
  bio,
  setBio,
}: RrMarkdownBioEditorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [isColorPickerOpen, setIsColorPickerOpen] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>("#ef4444");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyColor = (colorToApply: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = `[${selectedText || "Colored text"}]{${colorToApply}}`;
    const newCursorPos = start + (selectedText ? replacement.length : 1);

    setBio(text.substring(0, start) + replacement + text.substring(end));
    setIsColorPickerOpen(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

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
    } else if (syntax === "image") {
      replacement = `![${selectedText || placeholder || "Image description"}](https://example.com/image.png)`;
      newCursorPos = start + replacement.length;
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
    } else if (syntax === "quote") {
      replacement = `\n> ${selectedText || placeholder || "Quote text"}\n`;
      newCursorPos = start + replacement.length;
    } else if (syntax === "table") {
      replacement = `\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n`;
      newCursorPos = start + replacement.length;
    } else if (syntax === "hr") {
      replacement = `\n---\n`;
      newCursorPos = start + replacement.length;
    } else if (syntax === "color") {
      replacement = `[${selectedText || placeholder || "Colored text"}]{#ef4444}`;
      newCursorPos = start + (selectedText ? replacement.length : 1);
    }

    setBio(text.substring(0, start) + replacement + text.substring(end));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <Card className="flex flex-col flex-1 h-full min-h-0 w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <div className="flex flex-col gap-0.5 pt-2 text-left">
          <CardTitle>{t("account.aboutMeTitle")}</CardTitle>
          <CardDescription>
            {t("account.aboutMeDesc")}
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
            {t("account.write")}
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
            {t("account.preview")}
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 min-h-0 pb-6">
        {editorTab === "write" ? (
          <div className="border border-border rounded-xl overflow-hidden bg-muted/25 flex flex-col flex-1 min-h-0">
            {/* Markdown Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/50 border-b border-border shrink-0">
              <button
                type="button"
                onClick={() => insertMarkdown("bold", "bold text")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={t("account.toolbarBold")}
              >
                <Bold className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("italic", "italic text")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={t("account.toolbarItalic")}
              >
                <Italic className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("heading", "Heading")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={t("account.toolbarHeading")}
              >
                <Heading className="size-3.5" />
              </button>
              <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Insert Colored Text"
                  >
                    <Palette className="size-3.5" style={{ color: selectedColor }} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-3 border-border/80 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Select Text Color</span>
                    <span
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-muted/40"
                      style={{ color: selectedColor, borderColor: selectedColor }}
                    >
                      {selectedColor}
                    </span>
                  </div>

                  {/* Preset Swatches */}
                  <div className="grid grid-cols-6 gap-1.5">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => {
                          setSelectedColor(preset.hex);
                          applyColor(preset.hex);
                        }}
                        className={cn(
                          "size-6 rounded-full border border-border/40 transition-transform hover:scale-125 cursor-pointer shadow-xs",
                          selectedColor.toLowerCase() === preset.hex.toLowerCase() && "ring-2 ring-primary ring-offset-1"
                        )}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.name}
                      />
                    ))}
                  </div>

                  {/* Custom Hex & Native Color Picker */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="size-7 rounded-md border-0 bg-transparent cursor-pointer p-0 shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      placeholder="#ef4444"
                      className="h-7 px-2 text-xs font-mono rounded-md border border-border bg-muted/40 w-full focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applyColor(selectedColor)}
                      className="h-7 px-2.5 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="w-px h-4 bg-border mx-1" />

              <button
                type="button"
                onClick={() => insertMarkdown("link", "link text")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={t("account.toolbarLink")}
              >
                <Link className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("image", "Image description")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Insert Image"
              >
                <Image className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("code", "code")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={t("account.toolbarCode")}
              >
                <Code className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("quote", "Quote text")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Blockquote"
              >
                <Quote className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("table", "Table")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Insert Table"
              >
                <Table className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("hr", "Divider")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Horizontal Rule"
              >
                <Minus className="size-3.5" />
              </button>

              <div className="w-px h-4 bg-border mx-1" />

              <button
                type="button"
                onClick={() => insertMarkdown("bullet", "List item")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={t("account.toolbarBullet")}
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("number", "List item")}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={t("account.toolbarNumber")}
              >
                <ListOrdered className="size-3.5" />
              </button>

              <div className="ml-auto flex items-center">
                <RrMarkdownHelpModal
                  onInsertSyntax={(syntax) => {
                    const textarea = textareaRef.current;
                    if (!textarea) {
                      setBio(bio + "\n" + syntax);
                      return;
                    }
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = textarea.value;
                    setBio(text.substring(0, start) + syntax + text.substring(end));
                  }}
                />
              </div>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={4000}
              placeholder={t("account.writeBioPlaceholder")}
              className="w-full flex-1 min-h-0 p-3.5 bg-transparent text-xs md:text-sm text-foreground focus:outline-none placeholder:text-muted-foreground/50 resize-none font-sans custom-scrollbar"
            />
            <div className="flex justify-end px-3 py-1.5 bg-muted/30 border-t border-border text-[10px] text-muted-foreground font-semibold tabular-nums select-none shrink-0">
              {bio.length} / 4000
            </div>
          </div>
        ) : (
          /* Preview Container */
          <div className="w-full flex-1 min-h-0 overflow-y-auto p-4 border border-border bg-muted/10 rounded-xl custom-scrollbar animate-in fade-in duration-200 text-left">
            <RrMarkdownBioPreview
              content={bio}
              emptyFallbackText={t("account.nothingToPreview")}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
