"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Send,
  Loader2,
  X,
  FileText,
  ChevronDown,
  Paperclip,
  Save,
  MessageSquare,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  UploadCloud,
  ExternalLink,
  Users,
  UserPlus,
  PenTool,
} from "lucide-react";
import { useRRCrypto } from "@/hooks/useRRCrypto";
import { marked } from "marked";

interface RrComposeEmailModalProps {
  children?: React.ReactNode;
  accountId?: string;
  defaultTo?: string;
  defaultCc?: string;
  defaultBcc?: string;
  defaultSubject?: string;
  defaultBody?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface EmailAccount {
  id: string;
  accountName: string;
  emailAddress: string;
  color: string;
  signatureText?: string | null;
  useHtmlSignature?: boolean;
}

interface CannedResponse {
  id: string;
  name: string;
  subject?: string;
  bodyText: string;
  encryptedKey?: any;
}

interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

export function RrComposeEmailModal({
  children,
  accountId,
  defaultTo = "",
  defaultCc = "",
  defaultBcc = "",
  defaultSubject = "",
  defaultBody = "",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: RrComposeEmailModalProps): React.JSX.Element {
  const { data: session } = useSession();
  const { getPrivateKey, unwrapKey, decrypt } = useRRCrypto();
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState<boolean>(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen =
    isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

  const [toEmails, setToEmails] = useState<string[]>([]);
  const [toInput, setToInput] = useState<string>("");

  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState<string>("");

  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [bccInput, setBccInput] = useState<string>("");

  const [subject, setSubject] = useState<string>(defaultSubject);
  const [body, setBody] = useState<string>(defaultBody);
  const [sending, setSending] = useState<boolean>(false);
  const [showCc, setShowCc] = useState<boolean>(!!defaultCc);
  const [showBcc, setShowBcc] = useState<boolean>(!!defaultBcc);

  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accountId || "",
  );

  // Canned Responses & Templates
  const [templates, setTemplates] = useState<CannedResponse[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  // File Attachments & Options Sidebar State
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [returnReceipt, setReturnReceipt] = useState<boolean>(false);
  const [deliveryNotification, setDeliveryNotification] =
    useState<boolean>(false);
  const [keepFormatting, setKeepFormatting] = useState<boolean>(true);
  const [priority, setPriority] = useState<string>("Normal");
  const [saveSentLocation, setSaveSentLocation] = useState<string>("Sent");

  // Formatting state
  const [fontFamily, setFontFamily] = useState<string>("Helvetica");
  const [fontSize, setFontSize] = useState<string>("10pt");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState<boolean>(false);

  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const replacement = prefix + selected + suffix;
    setBody(text.substring(0, start) + replacement + text.substring(end));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length,
      );
    }, 0);
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Reset form state on modal open
  useEffect(() => {
    if (open) {
      const initialTo = defaultTo
        ? defaultTo
            .split(/[,;\s]+/)
            .map((em) => em.trim())
            .filter(Boolean)
        : [];
      setToEmails(initialTo);
      setToInput("");

      const initialCc = defaultCc
        ? defaultCc
            .split(/[,;\s]+/)
            .map((em) => em.trim())
            .filter(Boolean)
        : [];
      setCcEmails(initialCc);
      setCcInput("");

      const initialBcc = defaultBcc
        ? defaultBcc
            .split(/[,;\s]+/)
            .map((em) => em.trim())
            .filter(Boolean)
        : [];
      setBccEmails(initialBcc);
      setBccInput("");

      setSubject(defaultSubject);
      setBody(defaultBody);
      setShowCc(!!defaultCc);
      setShowBcc(!!defaultBcc);
      if (accountId) {
        setSelectedAccountId(accountId);
      }
    }
  }, [
    open,
    defaultTo,
    defaultCc,
    defaultBcc,
    defaultSubject,
    defaultBody,
    accountId,
  ]);

  // Fetch accounts & templates when modal is opened
  useEffect(() => {
    if (open && session?.accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch email accounts");
          return res.json();
        })
        .then((data) => {
          const list: EmailAccount[] = Array.isArray(data) ? data : [];
          setAccounts(list);
          if (list.length > 0) {
            const hasSelection = list.some(
              (acc) => acc.id === selectedAccountId,
            );
            if (!hasSelection) {
              const defaultAcc =
                list.find((acc) => acc.id === accountId) || list[0];
              setSelectedAccountId(defaultAcc.id);
            }
          }
        })
        .catch((err) => console.error(err));

      setLoadingTemplates(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails/canned-responses`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch templates");
          return res.json();
        })
        .then(async (data) => {
          const rawTemplates: CannedResponse[] = Array.isArray(data)
            ? data
            : [];
          const privateKey = await getPrivateKey();

          const decrypted = await Promise.all(
            rawTemplates.map(async (tmpl) => {
              if (tmpl.encryptedKey && privateKey) {
                try {
                  const dataKey = await unwrapKey(tmpl.encryptedKey);
                  let decSubject = tmpl.subject;
                  if (tmpl.subject) {
                    decSubject = await decrypt(tmpl.subject, dataKey);
                  }
                  const decBody = await decrypt(tmpl.bodyText, dataKey);
                  return { ...tmpl, subject: decSubject, bodyText: decBody };
                } catch (e) {
                  console.error("Canned response decryption failed:", e);
                  return tmpl;
                }
              }
              return tmpl;
            }),
          );
          setTemplates(decrypted);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoadingTemplates(false));
    }
  }, [open, session?.accessToken, accountId, selectedAccountId, getPrivateKey]);

  // Insert signature when account changes
  const handleInsertSignature = () => {
    if (selectedAccountId && accounts.length > 0) {
      const active = accounts.find((a) => a.id === selectedAccountId);
      if (active && active.signatureText) {
        const sig = `\n\n--\n${active.signatureText}`;
        setBody((prev) =>
          prev.includes(active.signatureText!) ? prev : prev + sig,
        );
        toast.success("Signature inserted!");
      } else {
        toast.info("No signature set for this account.");
      }
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles: AttachedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > 36 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 36 MB file size limit.`);
        continue;
      }
      newFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        name: f.name,
        size: f.size,
      });
    }
    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const val = toInput.trim().replace(/,$/, "");
      if (val) {
        if (isValidEmail(val)) {
          if (!toEmails.includes(val)) setToEmails([...toEmails, val]);
          setToInput("");
        } else {
          toast.error(`"${val}" is not a valid email address.`);
        }
      }
    } else if (e.key === "Backspace" && !toInput && toEmails.length > 0) {
      setToInput(toEmails[toEmails.length - 1]);
      setToEmails(toEmails.slice(0, -1));
    }
  };

  const handleCcKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const val = ccInput.trim().replace(/,$/, "");
      if (val) {
        if (isValidEmail(val)) {
          if (!ccEmails.includes(val)) setCcEmails([...ccEmails, val]);
          setCcInput("");
        } else {
          toast.error(`"${val}" is not a valid email address.`);
        }
      }
    } else if (e.key === "Backspace" && !ccInput && ccEmails.length > 0) {
      setCcInput(ccEmails[ccEmails.length - 1]);
      setCcEmails(ccEmails.slice(0, -1));
    }
  };

  const handleBccKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const val = bccInput.trim().replace(/,$/, "");
      if (val) {
        if (isValidEmail(val)) {
          if (!bccEmails.includes(val)) setBccEmails([...bccEmails, val]);
          setBccInput("");
        } else {
          toast.error(`"${val}" is not a valid email address.`);
        }
      }
    } else if (e.key === "Backspace" && !bccInput && bccEmails.length > 0) {
      setBccInput(bccEmails[bccEmails.length - 1]);
      setBccEmails(bccEmails.slice(0, -1));
    }
  };

  const insertTemplate = (tmpl: CannedResponse) => {
    if (tmpl.subject) setSubject(tmpl.subject);
    setBody((prev) =>
      prev.trim() ? prev + "\n\n" + tmpl.bodyText : tmpl.bodyText,
    );
    toast.success(`Inserted template "${tmpl.name}"`);
  };

  const handleSend = async () => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to send emails.");
      return;
    }
    if (!selectedAccountId) {
      toast.error("No email account selected.");
      return;
    }

    const trimmedToInput = toInput.trim();
    if (trimmedToInput && !isValidEmail(trimmedToInput)) {
      toast.error(
        `"${trimmedToInput}" in the To field is not a valid email address.`,
      );
      return;
    }

    const finalTo = [
      ...toEmails,
      ...(trimmedToInput ? [trimmedToInput] : []),
    ].join(", ");
    const finalCc = [
      ...ccEmails,
      ...(ccInput.trim() ? [ccInput.trim()] : []),
    ].join(", ");
    const finalBcc = [
      ...bccEmails,
      ...(bccInput.trim() ? [bccInput.trim()] : []),
    ].join(", ");

    if (!finalTo.trim()) {
      toast.error("Please specify at least one recipient.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${selectedAccountId}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({
            to: finalTo,
            cc: showCc && finalCc ? finalCc : undefined,
            bcc: showBcc && finalBcc ? finalBcc : undefined,
            subject,
            body,
            html: await marked.parse(body),
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || "Failed to send email.");
      }

      toast.success(
        t("pegasus.compose.sendSuccess", "Email sent successfully!"),
      );
      setOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "SMTP delivery failed.");
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedAccountId) {
      toast.error("No account selected.");
      return;
    }

    const finalTo = [
      ...toEmails,
      ...(toInput.trim() ? [toInput.trim()] : []),
    ].join(", ");
    const finalCc = [
      ...ccEmails,
      ...(ccInput.trim() ? [ccInput.trim()] : []),
    ].join(", ");
    const finalBcc = [
      ...bccEmails,
      ...(bccInput.trim() ? [bccInput.trim()] : []),
    ].join(", ");

    setSending(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/emails/${selectedAccountId}/drafts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({
            to: finalTo || undefined,
            cc: showCc && finalCc ? finalCc : undefined,
            bcc: showBcc && finalBcc ? finalBcc : undefined,
            subject: subject || undefined,
            body: body || undefined,
            html: body ? await marked.parse(body) : undefined,
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to save draft");
      toast.success(t("pegasus.compose.draftSaved", "Draft saved"));
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft");
    } finally {
      setSending(false);
    }
  };

  const handleCloseAttempt = (nextOpen: boolean) => {
    if (!nextOpen) {
      const isFilled =
        toEmails.length > 0 || subject.trim() !== "" || body.trim() !== "";
      if (isFilled) {
        setShowConfirmClose(true);
      } else {
        setOpen(false);
      }
    } else {
      setOpen(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseAttempt}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-6xl w-[92vw] h-[88vh] bg-background border-border shadow-2xl p-0 overflow-hidden flex flex-col rounded-2xl">
        <DialogTitle className="sr-only">Compose Message</DialogTitle>
        <DialogDescription className="sr-only">
          Compose email message with options and attachments panel.
        </DialogDescription>

        {/* Unsaved Changes Confirmation */}
        {showConfirmClose && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-popover border border-border shadow-2xl rounded-2xl p-6 max-w-sm w-full flex flex-col gap-4 text-center">
              <h3 className="text-sm font-bold text-foreground">
                {t(
                  "pegasus.compose.saveDraftQuestion",
                  "Save draft before closing?",
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t(
                  "pegasus.compose.unsavedChangesDesc",
                  "You have unsaved changes in this message.",
                )}
              </p>
              <div className="flex flex-col gap-2 mt-2">
                <Button
                  onClick={() => {
                    setShowConfirmClose(false);
                    handleSaveDraft();
                  }}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 font-bold text-xs rounded-xl cursor-pointer"
                >
                  {t("pegasus.compose.saveDraftButton", "Save Draft")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowConfirmClose(false);
                    setOpen(false);
                  }}
                  className="w-full h-9 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  {t("pegasus.compose.discardChanges", "Discard Changes")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmClose(false)}
                  className="w-full h-9 text-xs rounded-xl cursor-pointer"
                >
                  {t("pegasus.compose.keepEditing", "Keep Editing")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Dual-Pane Layout */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* LEFT PANE: Main Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border/70 bg-card">
            {/* Top Action Bar */}
            <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Save className="size-3.5 text-primary" />
                <span>Save</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Paperclip className="size-3.5 text-primary" />
                <span>Attach</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              <button
                type="button"
                onClick={handleInsertSignature}
                className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <PenTool className="size-3.5 text-primary" />
                <span>Signature</span>
              </button>

              {templates.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    >
                      <MessageSquare className="size-3.5 text-primary" />
                      <span>Responses</span>
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {templates.map((tmpl) => (
                      <DropdownMenuItem
                        key={tmpl.id}
                        onClick={() => insertTemplate(tmpl)}
                        className="cursor-pointer text-xs"
                      >
                        {tmpl.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Recipient & Header Inputs */}
            <div className="shrink-0 flex flex-col bg-card border-b border-border">
              {/* From */}
              <div className="flex items-center min-h-10 px-4 border-b border-border/50 gap-3 text-xs">
                <span className="text-muted-foreground w-14 shrink-0 font-medium">
                  From
                </span>
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger className="h-7 px-2.5 py-1 rounded-xl border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted shrink-0 focus:ring-0">
                    <SelectValue placeholder="Select email account" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {accounts.map((acc) => (
                      <SelectItem
                        key={acc.id}
                        value={acc.id}
                        className="text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: acc.color }}
                          />
                          <span className="font-semibold">
                            {acc.accountName}
                          </span>
                          <span className="text-muted-foreground font-normal">
                            ({acc.emailAddress})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* To */}
              <div className="flex items-center min-h-10 px-4 border-b border-border/50 gap-3 text-xs bg-card">
                <span className="text-muted-foreground w-14 shrink-0 font-medium">
                  To
                </span>
                <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-7">
                  {toEmails.map((email, idx) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="pl-2 pr-1 py-0.5 rounded-lg text-xs flex items-center gap-1 bg-muted/80 text-foreground"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() =>
                          setToEmails(toEmails.filter((_, i) => i !== idx))
                        }
                        className="text-muted-foreground hover:text-destructive p-0.5 rounded-sm"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                  <Input
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    onKeyDown={handleToKeyDown}
                    placeholder={
                      toEmails.length === 0 ? "recipient@example.com" : ""
                    }
                    className="bg-transparent border-0 shadow-none h-7 text-xs text-foreground focus-visible:ring-0 px-0 py-0 flex-1 min-w-35 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCc(!showCc)}
                    className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                    title="Toggle Contacts Picker"
                  >
                    <Users className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const val = toInput.trim();
                      if (val && isValidEmail(val) && !toEmails.includes(val)) {
                        setToEmails([...toEmails, val]);
                        setToInput("");
                      }
                    }}
                    className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                    title="Add recipient"
                  >
                    <UserPlus className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setShowCc(!showCc)}
                    className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-1 font-semibold"
                  >
                    Cc
                  </button>
                  <button
                    onClick={() => setShowBcc(!showBcc)}
                    className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-1 font-semibold"
                  >
                    Bcc
                  </button>
                </div>
              </div>

              {/* Cc */}
              {showCc && (
                <div className="flex items-center min-h-10 px-4 border-b border-border/50 gap-3 text-xs bg-card">
                  <span className="text-muted-foreground w-14 shrink-0 font-medium">
                    Cc
                  </span>
                  <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                    {ccEmails.map((email, idx) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="pl-2 pr-1 py-0.5 rounded-lg text-xs"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() =>
                            setCcEmails(ccEmails.filter((_, i) => i !== idx))
                          }
                          className="p-0.5 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      onKeyDown={handleCcKeyDown}
                      placeholder="cc@example.com"
                      className="bg-transparent border-0 shadow-none h-7 text-xs text-foreground focus-visible:ring-0 px-0 py-0 flex-1 min-w-35"
                    />
                  </div>
                </div>
              )}

              {/* Bcc */}
              {showBcc && (
                <div className="flex items-center min-h-10 px-4 border-b border-border/50 gap-3 text-xs bg-card">
                  <span className="text-muted-foreground w-14 shrink-0 font-medium">
                    Bcc
                  </span>
                  <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                    {bccEmails.map((email, idx) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="pl-2 pr-1 py-0.5 rounded-lg text-xs"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() =>
                            setBccEmails(bccEmails.filter((_, i) => i !== idx))
                          }
                          className="p-0.5 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      value={bccInput}
                      onChange={(e) => setBccInput(e.target.value)}
                      onKeyDown={handleBccKeyDown}
                      placeholder="bcc@example.com"
                      className="bg-transparent border-0 shadow-none h-7 text-xs text-foreground focus-visible:ring-0 px-0 py-0 flex-1 min-w-35"
                    />
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="flex items-center min-h-10 px-4 border-b border-border/50 gap-3 text-xs bg-card">
                <span className="text-muted-foreground w-14 shrink-0 font-medium">
                  Subject
                </span>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject Line"
                  className="bg-transparent border-0 shadow-none h-8 text-xs font-semibold text-foreground focus-visible:ring-0 px-0 w-full"
                />
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="px-3 py-1.5 border-b border-border bg-muted/10 flex items-center justify-between gap-1 flex-wrap shrink-0">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBody("")}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                  title="Clear content"
                >
                  <X className="size-3.5" />
                </button>
                <div className="h-4 w-px bg-border/60 mx-1" />

                <button
                  type="button"
                  onClick={() => insertFormatting("**", "**")}
                  className="p-1.5 hover:bg-muted text-foreground font-extrabold rounded-md cursor-pointer text-xs"
                  title="Bold"
                >
                  <Bold className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("*", "*")}
                  className="p-1.5 hover:bg-muted text-foreground italic rounded-md cursor-pointer text-xs"
                  title="Italic"
                >
                  <Italic className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("<u>", "</u>")}
                  className="p-1.5 hover:bg-muted text-foreground underline rounded-md cursor-pointer text-xs"
                  title="Underline"
                >
                  <Underline className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("~~", "~~")}
                  className="p-1.5 hover:bg-muted text-foreground line-through rounded-md cursor-pointer text-xs"
                  title="Strikethrough"
                >
                  <Strikethrough className="size-3.5" />
                </button>

                <div className="h-4 w-px bg-border/60 mx-1" />

                <button
                  type="button"
                  onClick={() => insertFormatting("\n")}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                  title="Align left"
                >
                  <AlignLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("\n")}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                  title="Align center"
                >
                  <AlignCenter className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("\n")}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                  title="Align right"
                >
                  <AlignRight className="size-3.5" />
                </button>

                <div className="h-4 w-px bg-border/60 mx-1" />

                {/* Font selector */}
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="h-6 text-[11px] border-border bg-card w-24 px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Helvetica" className="text-xs">
                      Helvetica
                    </SelectItem>
                    <SelectItem value="Arial" className="text-xs">
                      Arial
                    </SelectItem>
                    <SelectItem value="Times New Roman" className="text-xs">
                      Times New Roman
                    </SelectItem>
                    <SelectItem value="Courier New" className="text-xs">
                      Courier New
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Size selector */}
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger className="h-6 text-[11px] border-border bg-card w-16 px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="10pt" className="text-xs">
                      10pt
                    </SelectItem>
                    <SelectItem value="12pt" className="text-xs">
                      12pt
                    </SelectItem>
                    <SelectItem value="14pt" className="text-xs">
                      14pt
                    </SelectItem>
                    <SelectItem value="18pt" className="text-xs">
                      18pt
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="h-4 w-px bg-border/60 mx-1" />

                <button
                  type="button"
                  onClick={() => insertFormatting("\n- ")}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                  title="Bullet List"
                >
                  <List className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("\n1. ")}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                  title="Numbered List"
                >
                  <ListOrdered className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("\n> ")}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                  title="Quote"
                >
                  <Quote className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("[", "](url)")}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                  title="Link"
                >
                  <LinkIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("![alt](", ")")}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
                  title="Image"
                >
                  <ImageIcon className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Content Text Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-white text-black dark:bg-zinc-950 dark:text-zinc-50 relative">
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email message here..."
                style={{
                  fontFamily: fontFamily,
                  fontSize: fontSize,
                }}
                className="flex-1 w-full resize-none p-6 text-sm leading-relaxed outline-none border-0 focus:ring-0 bg-transparent text-inherit"
              />
            </div>

            {/* Bottom Action Bar */}
            <div className="p-3 border-t border-border bg-card flex items-center justify-between shrink-0">
              <Button
                onClick={handleSend}
                disabled={sending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-5 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                <span>Send</span>
              </Button>

              <button
                type="button"
                onClick={() =>
                  toast.info("Opened compose window in popped-out frame")
                }
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 hover:bg-muted rounded-xl transition-colors cursor-pointer"
              >
                <ExternalLink className="size-3.5" />
                <span>Open in new window</span>
              </button>
            </div>
          </div>

          {/* RIGHT PANE: Options and attachments sidebar */}
          <div className="w-80 shrink-0 flex flex-col h-full bg-card border-l border-border/70 p-4 space-y-5 overflow-y-auto no-scrollbar">
            <h3 className="text-xs font-bold text-foreground border-b border-border/60 pb-2">
              Options and attachments
            </h3>

            {/* Drag & Drop File Upload Box */}
            <div className="space-y-3">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                className="border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Maximum allowed file size is 36 MB
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold rounded-xl bg-card border-border hover:bg-muted shadow-2xs"
                >
                  <Paperclip className="size-3.5 text-primary" />
                  <span>Attach a file</span>
                </Button>

                <div className="pt-2 text-muted-foreground/40 group-hover:text-primary/60 transition-colors">
                  <UploadCloud className="size-12" />
                </div>
              </div>

              {/* Attached Files List */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    Attached Files ({attachments.length})
                  </span>
                  <div className="space-y-1.5">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 bg-muted/40 border border-border/60 rounded-xl text-xs"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <FileText className="size-3.5 text-primary shrink-0" />
                          <span
                            className="truncate max-w-35 font-medium"
                            title={att.name}
                          >
                            {att.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments(
                              attachments.filter((a) => a.id !== att.id),
                            )
                          }
                          className="p-1 text-muted-foreground hover:text-destructive rounded-md cursor-pointer"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Toggles Section */}
            <div className="space-y-3 pt-2 border-t border-border/60 text-xs">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="return-receipt"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Return receipt
                </Label>
                <Switch
                  id="return-receipt"
                  checked={returnReceipt}
                  onCheckedChange={setReturnReceipt}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label
                  htmlFor="delivery-status"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Delivery status notification
                </Label>
                <Switch
                  id="delivery-status"
                  checked={deliveryNotification}
                  onCheckedChange={setDeliveryNotification}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label
                  htmlFor="keep-formatting"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Keep formatting
                </Label>
                <Switch
                  id="keep-formatting"
                  checked={keepFormatting}
                  onCheckedChange={setKeepFormatting}
                />
              </div>
            </div>

            {/* Select Dropdowns Section */}
            <div className="space-y-3 pt-2 border-t border-border/60 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Priority
                </Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-8 text-xs bg-background border-border rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Low" className="text-xs">
                      Low
                    </SelectItem>
                    <SelectItem value="Normal" className="text-xs">
                      Normal
                    </SelectItem>
                    <SelectItem value="High" className="text-xs">
                      High
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Save sent message in
                </Label>
                <Select
                  value={saveSentLocation}
                  onValueChange={setSaveSentLocation}
                >
                  <SelectTrigger className="h-8 text-xs bg-background border-border rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Sent" className="text-xs">
                      Sent
                    </SelectItem>
                    <SelectItem value="Drafts" className="text-xs">
                      Drafts
                    </SelectItem>
                    <SelectItem value="None" className="text-xs">
                      Don't save
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
