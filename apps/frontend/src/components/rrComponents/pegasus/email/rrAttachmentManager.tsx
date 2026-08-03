"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  Search,
  Loader2,
  ExternalLink,
  HardDrive,
  LayoutGrid,
  List as ListIcon,
  CheckSquare,
  Square,
  X,
  ShieldCheck,
  Calendar,
  User,
  Filter,
  ArrowUpDown,
  FileArchive,
  Film,
  Sparkles,
  Paperclip,
  FileCode,
  Music,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface AttachmentItem {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  messageId: string;
  messageSubject: string;
  messageFrom: string;
  messageDate: string;
  accountId: string;
  encryptedKey?: unknown;
}

interface EmailAccount {
  id: string;
  accountName: string;
  emailAddress: string;
  color: string;
}

export default function RrAttachmentManager(): React.JSX.Element {
  const { data: session } = useSession();
  const router = useRouter();
  const { getPrivateKey, unwrapKey, decrypt, isEncryptionUnlocked } =
    useRRCrypto();
  const { t } = useTranslation();

  const [loading, setLoading] = useState<boolean>(true);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedAccountFilter, setSelectedAccountFilter] =
    useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);

  // Multi Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloadingBatch, setDownloadingBatch] = useState<boolean>(false);

  // Inspector Drawer State
  const [inspectedItem, setInspectedItem] = useState<AttachmentItem | null>(
    null,
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getShortExtension = (filename: string, mime: string): string => {
    if (filename && filename.includes(".")) {
      const ext = filename.split(".").pop()?.toUpperCase();
      if (ext && ext.length <= 5) return ext;
    }

    if (!mime) return "FILE";
    const lower = mime.toLowerCase();

    if (lower.includes("wordprocessingml") || lower.includes("msword"))
      return "DOCX";
    if (lower.includes("spreadsheetml") || lower.includes("excel"))
      return "XLSX";
    if (lower.includes("presentationml") || lower.includes("powerpoint"))
      return "PPTX";
    if (lower.includes("pdf")) return "PDF";
    if (lower.includes("png")) return "PNG";
    if (lower.includes("jpeg") || lower.includes("jpg")) return "JPG";
    if (lower.includes("gif")) return "GIF";
    if (lower.includes("zip") || lower.includes("compressed")) return "ZIP";
    if (lower.includes("plain") || lower.includes("text")) return "TXT";
    if (lower.includes("json")) return "JSON";

    const sub = lower.split("/")[1] || "";
    const cleanSub =
      sub
        .replace(/^vnd\./, "")
        .replace(/^x-/, "")
        .split(".")[0] || "FILE";
    return cleanSub.slice(0, 5).toUpperCase();
  };

  const formatSenderName = (fromStr: string): string => {
    if (!fromStr) return "Unknown Sender";
    const nameMatch = fromStr.match(/^([^<]+)/);
    const name = nameMatch ? nameMatch[1].replace(/"/g, "").trim() : "";
    if (name) return name;
    const emailMatch = fromStr.match(/<([^>]+)>/);
    if (emailMatch && emailMatch[1]) return emailMatch[1];
    return fromStr.replace(/"/g, "").trim();
  };

  const getFileCategory = (mime: string): string => {
    if (!mime) return "other";
    const lower = mime.toLowerCase();
    if (lower.startsWith("image/")) return "image";
    if (lower.includes("pdf")) return "pdf";
    if (
      lower.includes("word") ||
      lower.includes("document") ||
      lower.includes("sheet") ||
      lower.includes("text")
    )
      return "document";
    if (
      lower.includes("zip") ||
      lower.includes("rar") ||
      lower.includes("tar") ||
      lower.includes("7z")
    )
      return "archive";
    if (
      lower.startsWith("video/") ||
      lower.startsWith("audio/") ||
      lower.includes("media")
    )
      return "media";
    return "other";
  };

  const getFileIcon = (mime: string): React.JSX.Element => {
    const category = getFileCategory(mime);
    switch (category) {
      case "image":
        return (
          <ImageIcon className="size-5 text-emerald-500 dark:text-emerald-400" />
        );
      case "pdf":
        return <FileText className="size-5 text-rose-500 dark:text-rose-400" />;
      case "document":
        return <FileText className="size-5 text-blue-500 dark:text-blue-400" />;
      case "archive":
        return (
          <FileArchive className="size-5 text-amber-500 dark:text-amber-400" />
        );
      case "media":
        return <Film className="size-5 text-purple-500 dark:text-purple-400" />;
      default:
        return <FileIcon className="size-5 text-muted-foreground" />;
    }
  };

  const getCategoryColor = (type: string): string => {
    switch (type) {
      case "image":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "pdf":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "document":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "archive":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "media":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  // Fetch Accounts & Attachments
  const fetchAllAttachments = useCallback(async (): Promise<void> => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      // 1. Fetch Email Accounts
      const accRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      let accountList: EmailAccount[] = [];
      if (accRes.ok) {
        accountList = await accRes.json();
        setAccounts(accountList);
      }

      // 2. Fetch Messages with Attachments across all accounts & folders
      const privateKey = await getPrivateKey();
      const allFetched: AttachmentItem[] = [];
      const seenAttachmentIds = new Set<string>();

      // Try fetching all messages first
      let messages: any[] = [];
      const allRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/unified/all-messages?limit=200`,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );

      if (allRes.ok) {
        messages = await allRes.json();
      } else {
        // Fallback: Fetch common folders (inbox, sent, archive, trash)
        const folders = ["inbox", "sent", "archive", "trash"];
        for (const folder of folders) {
          const fRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/emails/unified/folders/${folder}/messages?limit=100`,
            {
              headers: { Authorization: `Bearer ${session.accessToken}` },
            },
          );
          if (fRes.ok) {
            const folderMsgs = await fRes.json();
            messages.push(...folderMsgs);
          }
        }
      }

      for (const msg of messages) {
        if (msg.attachments && msg.attachments.length > 0) {
          let subject = msg.subject || "(No Subject)";
          let fromSender = msg.from || "";
          let dataKey: any = null;

          if (msg.encryptedKey && privateKey) {
            try {
              dataKey = await unwrapKey(msg.encryptedKey);
              try {
                subject = await decrypt(msg.subject, dataKey);
              } catch {}
              try {
                fromSender = await decrypt(msg.from, dataKey);
              } catch {}
            } catch (e) {
              console.error(
                "Failed to decrypt email metadata for attachments:",
                e,
              );
            }
          }

          for (const att of msg.attachments) {
            if (seenAttachmentIds.has(att.id)) continue;
            seenAttachmentIds.add(att.id);

            let filename = att.filename;
            if (msg.encryptedKey && dataKey) {
              try {
                filename = await decrypt(att.filename, dataKey);
              } catch {}
            }

            allFetched.push({
              id: att.id,
              filename,
              contentType: att.contentType,
              size: att.size,
              messageId: msg.id,
              messageSubject: subject,
              messageFrom: fromSender,
              messageDate: msg.date,
              accountId: msg.userEmailAccountId || msg.accountId,
              encryptedKey: msg.encryptedKey,
            });
          }
        }
      }

      setAttachments(allFetched);
    } catch (err) {
      console.error(err);
      toast.error(t("pegasus.attachments.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, getPrivateKey, unwrapKey, decrypt, t]);

  useEffect(() => {
    fetchAllAttachments();
  }, [fetchAllAttachments, isEncryptionUnlocked]);

  const handleDownloadAttachment = async (
    item: AttachmentItem,
  ): Promise<void> => {
    if (!session?.accessToken) return;
    try {
      toast.info(
        t("pegasus.attachments.startingDownload", { filename: item.filename }),
      );
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/attachments/${item.id}`,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      if (!res.ok) throw new Error("Download failed");

      let finalBuffer = await res.arrayBuffer();

      if (item.encryptedKey) {
        try {
          const dataKey = await unwrapKey(item.encryptedKey as any);
          finalBuffer = await decrypt(finalBuffer, dataKey as any);
        } catch (decErr) {
          console.error(
            "Failed to decrypt attachment content on download:",
            decErr,
          );
        }
      }

      const blob = new Blob([finalBuffer]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        t("pegasus.attachments.downloadSuccess", { filename: item.filename }),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t("pegasus.attachments.downloadFailed", { message: msg }));
    }
  };

  const handleBatchDownload = async (): Promise<void> => {
    if (selectedIds.length === 0) return;
    setDownloadingBatch(true);
    try {
      const selectedItems = attachments.filter((att) =>
        selectedIds.includes(att.id),
      );
      for (const item of selectedItems) {
        await handleDownloadAttachment(item);
      }
      setSelectedIds([]);
    } catch (e) {
      console.error("Batch download error:", e);
    } finally {
      setDownloadingBatch(false);
    }
  };

  const totalStorageBytes = useMemo(() => {
    return attachments.reduce((sum, item) => sum + item.size, 0);
  }, [attachments]);

  const filteredAttachments = useMemo(() => {
    let result = attachments.filter((item) => {
      if (
        selectedAccountFilter !== "all" &&
        item.accountId !== selectedAccountFilter
      ) {
        return false;
      }

      const query = searchQuery.toLowerCase();
      const matchesSearch =
        item.filename.toLowerCase().includes(query) ||
        item.messageSubject.toLowerCase().includes(query) ||
        item.messageFrom.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (selectedType === "all") return true;
      const category = getFileCategory(item.contentType);
      return category === selectedType;
    });

    result = [...result].sort((a, b) => {
      if (sortOption === "newest") {
        return (
          new Date(b.messageDate).getTime() - new Date(a.messageDate).getTime()
        );
      }
      if (sortOption === "oldest") {
        return (
          new Date(a.messageDate).getTime() - new Date(b.messageDate).getTime()
        );
      }
      if (sortOption === "largest") {
        return b.size - a.size;
      }
      if (sortOption === "smallest") {
        return a.size - b.size;
      }
      if (sortOption === "name-asc") {
        return a.filename.localeCompare(b.filename);
      }
      if (sortOption === "name-desc") {
        return b.filename.localeCompare(a.filename);
      }
      return 0;
    });

    return result;
  }, [
    attachments,
    searchQuery,
    selectedType,
    selectedAccountFilter,
    sortOption,
  ]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAttachments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAttachments.map((a) => a.id));
    }
  };

  return (
    <div className="flex-1 h-full w-full flex flex-col bg-background text-foreground p-4 gap-4 overflow-hidden">
      {/* Top Header Panel matching rrEmailReader */}
      <div className="p-4 bg-card border border-border/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Paperclip className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {t("pegasus.attachments.title", "Attachments")}
            </h1>
          </div>
        </div>

        {/* View Mode & Account Selector */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-8.5 px-3 rounded-xl bg-muted/40 hover:bg-muted text-foreground border border-border/80 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Filter className="size-3.5 text-primary" />
                <span>
                  {selectedAccountFilter === "all"
                    ? t("pegasus.attachments.allAccounts")
                    : accounts.find((a) => a.id === selectedAccountFilter)
                        ?.accountName || t("pegasus.attachments.allAccounts")}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-popover border-border rounded-xl"
            >
              <DropdownMenuItem
                onClick={() => setSelectedAccountFilter("all")}
                className={cn(
                  "text-xs cursor-pointer rounded-lg",
                  selectedAccountFilter === "all" &&
                    "font-bold text-primary bg-primary/10",
                )}
              >
                {t("pegasus.attachments.allAccounts")}
              </DropdownMenuItem>
              {accounts.map((acc) => (
                <DropdownMenuItem
                  key={acc.id}
                  onClick={() => setSelectedAccountFilter(acc.id)}
                  className={cn(
                    "text-xs cursor-pointer rounded-lg flex items-center gap-2",
                    selectedAccountFilter === acc.id &&
                      "font-bold text-primary bg-primary/10",
                  )}
                >
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: acc.color }}
                  />
                  <span className="truncate">{acc.accountName}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center bg-muted/40 border border-border/80 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1 rounded-lg text-xs transition-colors cursor-pointer",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Grid View"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1 rounded-lg text-xs transition-colors cursor-pointer",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="List View"
            >
              <ListIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats Bar - Solid Card Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <div className="p-3.5 bg-card border border-border/80 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("pegasus.attachments.totalStorage")}
            </span>
            <h3 className="text-xl font-black text-foreground">
              {formatBytes(totalStorageBytes)}
            </h3>
          </div>
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <HardDrive className="size-5 text-primary" />
          </div>
        </div>

        <div className="p-3.5 bg-card border border-border/80 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("pegasus.attachments.totalFiles")}
            </span>
            <h3 className="text-xl font-black text-foreground">
              {attachments.length}
            </h3>
          </div>
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <FileText className="size-5 text-primary" />
          </div>
        </div>

        <div className="p-3.5 bg-card border border-border/80 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("pegasus.attachments.accountsConnected")}
            </span>
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              {accounts.map((acc) => (
                <span
                  key={acc.id}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                  style={{
                    backgroundColor: `${acc.color}15`,
                    color: acc.color,
                    borderColor: `${acc.color}35`,
                  }}
                >
                  {acc.accountName}
                </span>
              ))}
              {accounts.length === 0 && (
                <span className="text-xs text-muted-foreground font-semibold">
                  0
                </span>
              )}
            </div>
          </div>
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <User className="size-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Category Chips */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-card p-3 border border-border/80 rounded-2xl shrink-0">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 h-8.5 text-xs bg-muted/30 border border-border/80 rounded-xl text-foreground placeholder-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/45"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {["all", "image", "pdf", "document", "archive", "media"].map(
            (type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize select-none cursor-pointer whitespace-nowrap",
                  selectedType === type
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t(
                  `pegasus.attachments.type${
                    type.charAt(0).toUpperCase() + type.slice(1)
                  }`,
                )}
              </button>
            ),
          )}
        </div>

        {/* Sort Controls */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-8.5 px-3 bg-muted/30 hover:bg-muted text-foreground border border-border/80 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0"
            >
              <ArrowUpDown className="size-3.5 text-primary" />
              <span>{t("pegasus.attachments.sortBy")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-popover border-border rounded-xl"
          >
            <DropdownMenuItem
              onClick={() => setSortOption("newest")}
              className={cn(
                "text-xs cursor-pointer rounded-lg",
                sortOption === "newest" &&
                  "font-bold text-primary bg-primary/10",
              )}
            >
              {t("pegasus.attachments.sortNewest")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSortOption("oldest")}
              className={cn(
                "text-xs cursor-pointer rounded-lg",
                sortOption === "oldest" &&
                  "font-bold text-primary bg-primary/10",
              )}
            >
              {t("pegasus.attachments.sortOldest")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSortOption("largest")}
              className={cn(
                "text-xs cursor-pointer rounded-lg",
                sortOption === "largest" &&
                  "font-bold text-primary bg-primary/10",
              )}
            >
              {t("pegasus.attachments.sortLargest")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSortOption("smallest")}
              className={cn(
                "text-xs cursor-pointer rounded-lg",
                sortOption === "smallest" &&
                  "font-bold text-primary bg-primary/10",
              )}
            >
              {t("pegasus.attachments.sortSmallest")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSortOption("name-asc")}
              className={cn(
                "text-xs cursor-pointer rounded-lg",
                sortOption === "name-asc" &&
                  "font-bold text-primary bg-primary/10",
              )}
            >
              {t("pegasus.attachments.sortNameAsc")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setSortOption("name-desc")}
              className={cn(
                "text-xs cursor-pointer rounded-lg",
                sortOption === "name-desc" &&
                  "font-bold text-primary bg-primary/10",
              )}
            >
              {t("pegasus.attachments.sortNameDesc")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content Area - Takes 100% Remaining Height */}
      <div className="flex-1 min-h-0 flex flex-col justify-start overflow-y-auto pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground font-semibold">
              {t("pegasus.attachments.extracting")}
            </span>
          </div>
        ) : filteredAttachments.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border/80 rounded-2xl text-muted-foreground space-y-3 bg-card/40 my-auto">
            <div className="size-14 rounded-2xl bg-muted/40 border border-border flex items-center justify-center mx-auto text-muted-foreground/60">
              <FileText className="size-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {t("pegasus.attachments.noAttachments")}
              </p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search query or filter settings.
              </p>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View Mode */
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.04 } },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4"
          >
            {filteredAttachments.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const matchedAccount = accounts.find(
                (a) => a.id === item.accountId,
              );
              const category = getFileCategory(item.contentType);
              const categoryBadgeStyle = getCategoryColor(category);

              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  key={item.id}
                  onClick={() => setInspectedItem(item)}
                  className={cn(
                    "group relative p-4 bg-card border rounded-2xl transition-all duration-150 shadow-2xs hover:border-primary/50 flex flex-col justify-between space-y-3 cursor-pointer overflow-hidden",
                    isSelected
                      ? "border-primary ring-1 ring-primary/40 bg-primary/5"
                      : "border-border/80 hover:border-border",
                  )}
                >
                  {/* Select Checkbox Top Right */}
                  <button
                    type="button"
                    onClick={(e) => toggleSelect(item.id, e)}
                    className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-10"
                  >
                    {isSelected ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                    )}
                  </button>

                  {/* Icon & File Metadata */}
                  <div className="flex items-start gap-3 min-w-0 pr-7">
                    <div
                      className={cn(
                        "p-2.5 rounded-xl border shrink-0 group-hover:scale-105 transition-transform",
                        categoryBadgeStyle,
                      )}
                    >
                      {getFileIcon(item.contentType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {item.filename}
                      </h3>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {formatBytes(item.size)}
                        </span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md border border-border/60 bg-muted/40 text-muted-foreground">
                          {getShortExtension(item.filename, item.contentType)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sender & Subject Box */}
                  <div className="pt-2 border-t border-border/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground/90 truncate max-w-35">
                        {t("pegasus.attachments.from")}{" "}
                        {formatSenderName(item.messageFrom)}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
                        {new Date(item.messageDate).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate max-w-50">
                      {item.messageSubject}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 w-full">
                    {matchedAccount ? (
                      <span
                        className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg border truncate max-w-25"
                        style={{
                          backgroundColor: `${matchedAccount.color}15`,
                          color: matchedAccount.color,
                          borderColor: `${matchedAccount.color}35`,
                        }}
                      >
                        {matchedAccount.accountName}
                      </span>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadAttachment(item);
                        }}
                        className="h-7 px-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-bold cursor-pointer shadow-2xs gap-1"
                      >
                        <Download className="size-3" />
                        {t("pegasus.attachments.download")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/pegasus/unified/inbox?messageId=${item.messageId}`,
                          );
                        }}
                        className="h-7 w-7 p-0 rounded-xl border border-transparent hover:border-border text-muted-foreground hover:text-foreground cursor-pointer"
                        title={t("pegasus.attachments.viewEmail")}
                      >
                        <ExternalLink className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* List View Mode */
          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs pb-2">
            <div className="px-4 py-3 bg-muted/40 border-b border-border/80 flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {selectedIds.length === filteredAttachments.length &&
                  filteredAttachments.length > 0 ? (
                    <CheckSquare className="size-4 text-primary" />
                  ) : (
                    <Square className="size-4" />
                  )}
                </button>
                <span>Filename</span>
              </div>
              <div className="hidden sm:flex items-center gap-8">
                <span>Sender / Subject</span>
                <span>Size</span>
                <span>Actions</span>
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {filteredAttachments.map((item) => {
                const isSelected = selectedIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => setInspectedItem(item)}
                    className={cn(
                      "px-4 py-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/40 transition-colors cursor-pointer",
                      isSelected && "bg-primary/10 font-medium",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => toggleSelect(item.id, e)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4 text-muted-foreground/40" />
                        )}
                      </button>

                      <div className="p-2 bg-muted/60 border border-border/60 rounded-xl shrink-0">
                        {getFileIcon(item.contentType)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-foreground truncate block">
                          {item.filename}
                        </span>
                        <span className="text-[10px] text-muted-foreground sm:hidden block truncate pt-0.5">
                          {item.messageFrom} • {formatBytes(item.size)}
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-8 shrink-0 text-muted-foreground">
                      <div className="w-56 truncate">
                        <span className="font-semibold text-foreground">
                          {formatSenderName(item.messageFrom)}
                        </span>
                        <span className="block text-[10px] truncate text-muted-foreground">
                          {item.messageSubject}
                        </span>
                      </div>
                      <span className="w-20 font-mono text-[11px]">
                        {formatBytes(item.size)}
                      </span>
                      <div className="flex items-center gap-1.5 w-24 justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadAttachment(item);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-card rounded-lg transition-colors cursor-pointer"
                          title={t("pegasus.attachments.download")}
                        >
                          <Download className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `/pegasus/unified/inbox?messageId=${item.messageId}`,
                            );
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg transition-colors cursor-pointer"
                          title={t("pegasus.attachments.viewEmail")}
                        >
                          <ExternalLink className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Dock */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-popover border border-border shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4"
          >
            <span className="text-xs font-bold text-foreground">
              {t("pegasus.attachments.selectedCount", {
                count: selectedIds.length,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBatchDownload}
                disabled={downloadingBatch}
                size="sm"
                className="h-8.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs gap-1.5"
              >
                {downloadingBatch ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                {t("pegasus.attachments.downloadSelected", {
                  count: selectedIds.length,
                })}
              </Button>
              <Button
                onClick={() => setSelectedIds([])}
                size="sm"
                variant="outline"
                className="h-8.5 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {t("pegasus.attachments.clearSelection")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inspector Side Drawer Sheet */}
      <Sheet
        open={!!inspectedItem}
        onOpenChange={(open) => !open && setInspectedItem(null)}
      >
        <SheetContent className="w-80 sm:w-96 p-6 border-l border-border bg-card text-card-foreground">
          <SheetHeader>
            <SheetTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Paperclip className="size-4 text-primary" />
              {t("pegasus.attachments.fileDetails")}
            </SheetTitle>
          </SheetHeader>

          {inspectedItem && (
            <div className="space-y-6 pt-4">
              <div className="flex flex-col items-center justify-center p-6 bg-muted/30 border border-border/80 rounded-2xl text-center space-y-3">
                <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-2xl shadow-2xs">
                  {getFileIcon(inspectedItem.contentType)}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground break-all">
                    {inspectedItem.filename}
                  </h3>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {formatBytes(inspectedItem.size)} •{" "}
                    {getShortExtension(
                      inspectedItem.filename,
                      inspectedItem.contentType,
                    )}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-semibold text-[11px]">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>{t("pegasus.attachments.encryptedKeyStatus")}</span>
                </div>

                <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="size-3.5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground truncate">
                      {inspectedItem.messageFrom}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-3.5 text-primary shrink-0" />
                    <span>
                      {new Date(inspectedItem.messageDate).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Originating Subject
                  </span>
                  <p className="font-semibold text-foreground leading-relaxed">
                    {inspectedItem.messageSubject}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-border/40">
                <Button
                  onClick={() => handleDownloadAttachment(inspectedItem)}
                  className="w-full h-9.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs cursor-pointer shadow-2xs gap-1.5"
                >
                  <Download className="size-3.5" />
                  {t("pegasus.attachments.download")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/pegasus/unified/inbox?messageId=${inspectedItem.messageId}`,
                    )
                  }
                  className="w-full h-9.5 rounded-xl border border-border text-xs font-semibold cursor-pointer gap-1.5"
                >
                  <ExternalLink className="size-3.5" />
                  {t("pegasus.attachments.viewEmail")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
