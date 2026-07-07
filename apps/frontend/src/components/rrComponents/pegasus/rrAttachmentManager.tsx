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
  ChevronLeft,
  Mail,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  encryptedKey?: any;
}

export default function RrAttachmentManager(): React.JSX.Element {
  const { data: session } = useSession();
  const router = useRouter();
  const { getPrivateKey, unwrapKey, decrypt } = useRRCrypto();

  const [loading, setLoading] = useState<boolean>(true);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [accounts, setAccounts] = useState<any[]>([]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) {
      return <ImageIcon className="size-5 text-indigo-400" />;
    }
    if (
      contentType.includes("pdf") ||
      contentType.includes("word") ||
      contentType.includes("text")
    ) {
      return <FileText className="size-5 text-blue-400" />;
    }
    return <FileIcon className="size-5 text-zinc-400" />;
  };

  const fetchAllAttachments = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      // 1. Fetch all accounts
      const accountsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails`,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      if (!accountsRes.ok) throw new Error("Failed to load accounts");
      const accountsList = await accountsRes.json();
      setAccounts(accountsList);

      const allFetched: AttachmentItem[] = [];
      const privateKey = await getPrivateKey();

      // 2. Fetch inbox, sent, and archive messages for each account
      const folders = ["inbox", "sent", "archive"];
      for (const account of accountsList) {
        for (const folder of folders) {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/emails/${account.id}/folders/${folder}/messages?limit=100`,
            {
              headers: { Authorization: `Bearer ${session.accessToken}` },
            },
          );
          if (!res.ok) continue;
          const messages = await res.json();

          for (const msg of messages) {
            if (msg.attachments && msg.attachments.length > 0) {
              // Decrypt email subject & from to show in metadata
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
                let filename = att.filename;
                if (msg.encryptedKey && dataKey) {
                  try {
                    filename = await decrypt(
                      att.filename,
                      dataKey,
                    );
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
                  accountId: account.id,
                  encryptedKey: msg.encryptedKey,
                });
              }
            }
          }
        }
      }

      // Sort by date descending
      allFetched.sort(
        (a, b) =>
          new Date(b.messageDate).getTime() - new Date(a.messageDate).getTime(),
      );
      setAttachments(allFetched);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attachments.");
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, getPrivateKey]);

  useEffect(() => {
    fetchAllAttachments();
  }, [fetchAllAttachments]);

  const handleDownloadAttachment = async (item: AttachmentItem) => {
    if (!session?.accessToken) return;
    try {
      toast.info(`Starting download of ${item.filename}...`);
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
          const dataKey = await unwrapKey(item.encryptedKey);
          finalBuffer = await decrypt(finalBuffer, dataKey);
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
      toast.success(`${item.filename} downloaded successfully!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Download failed: ${err.message || String(err)}`);
    }
  };

  const filteredAttachments = useMemo(() => {
    return attachments.filter((item) => {
      const matchesSearch =
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.messageSubject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.messageFrom.toLowerCase().includes(searchQuery.toLowerCase());

      if (selectedType === "all") return matchesSearch;
      if (selectedType === "image")
        return matchesSearch && item.contentType.startsWith("image/");
      if (selectedType === "pdf")
        return matchesSearch && item.contentType.includes("pdf");
      if (selectedType === "document") {
        return (
          matchesSearch &&
          (item.contentType.includes("word") ||
            item.contentType.includes("text") ||
            item.contentType.includes("spreadsheet") ||
            item.contentType.includes("excel"))
        );
      }
      return matchesSearch;
    });
  }, [attachments, searchQuery, selectedType]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
              Attachment Manager
            </h1>
            <p className="text-xs text-zinc-500">
              Browse and download attachments across all user email folders.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900/40 p-4 border border-zinc-900 rounded-2xl">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filename, sender, subject..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-950/60 border-zinc-800/80 rounded-xl text-zinc-200 placeholder-zinc-600 focus-visible:ring-1 focus-visible:ring-primary/45"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto shrink-0 overflow-x-auto no-scrollbar">
          {["all", "image", "pdf", "document"].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize select-none cursor-pointer ${
                selectedType === type
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-start">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <Loader2 className="size-8 text-primary animate-spin" />
            <span className="text-sm text-zinc-500">
              Extracting E2EE attachment files...
            </span>
          </div>
        ) : filteredAttachments.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-zinc-800 rounded-3xl text-zinc-600">
            No attachments found matching current criteria.
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredAttachments.map((item) => (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { opacity: 1, y: 0 },
                }}
                key={item.id}
                className="group p-4 bg-zinc-900/20 backdrop-blur-xs border border-zinc-900 hover:border-zinc-800/80 rounded-2xl transition-all shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl shrink-0 group-hover:border-zinc-800 transition-colors">
                    {getFileIcon(item.contentType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-zinc-200 truncate group-hover:text-zinc-100 transition-colors">
                      {item.filename}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-light mt-0.5">
                      {formatBytes(item.size)} •{" "}
                      {item.contentType.split("/")[1]?.toUpperCase() || "BIN"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-900/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="font-medium text-zinc-400 truncate max-w-[120px]">
                      From:{" "}
                      {item.messageFrom.replace(/<.*>/, "").replace(/"/g, "")}
                    </span>
                    <span>
                      {new Date(item.messageDate).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-600 truncate max-w-[280px]">
                    Subject: {item.messageSubject}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1.5 w-full">
                  <Button
                    onClick={() => handleDownloadAttachment(item)}
                    size="sm"
                    className="flex-1 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-zinc-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
                  >
                    <Download className="size-3.5" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      router.push(
                        `/pegasus/unified/inbox?messageId=${item.messageId}`,
                      )
                    }
                    className="rounded-xl border border-transparent hover:border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer px-2"
                    title="View Email"
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
