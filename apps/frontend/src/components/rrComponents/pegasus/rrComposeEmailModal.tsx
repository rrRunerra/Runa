"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Send,
  Loader2,
  Edit,
  X,
  Eye,
  FileText,
  ChevronDown,
  Smile,
  Paperclip,
  Bolt,
  Calendar,
  Tag,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  Link as LinkIcon,
  Image as ImageIcon,
  Quote,
  Maximize2,
  Check,
  Share2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";
import { marked } from "marked";
import { cn } from "@/lib/utils";

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
  const { getPrivateKey } = useRRe2ee();
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

  // Canned Responses States
  const [templates, setTemplates] = useState<CannedResponse[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  // Undo Send Timer State
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [undoTimerToastId, setUndoTimerToastId] = useState<
    string | number | null
  >(null);

  const [useMarkdown, setUseMarkdown] = useState<boolean>(false);

  const [showFormatting, setShowFormatting] = useState<boolean>(true);
  const [fontFamily, setFontFamily] = useState<string>("sans");
  const [fontSize, setFontSize] = useState<string>("14");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

    // Reset cursor position and focus
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

  // Reset form when modal opens
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

  // Fetch accounts & templates when modal is open
  useEffect(() => {
    if (open && session?.accessToken) {
      // Fetch Accounts
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

      // Fetch Canned Responses Templates
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
          const cryptoBrowser = privateKey
            ? await import("@runa/crypto/browser")
            : null;

          const decrypted = await Promise.all(
            rawTemplates.map(async (tmpl) => {
              if (tmpl.encryptedKey && cryptoBrowser && privateKey) {
                try {
                  const dataKey = await cryptoBrowser.decryptEmailDataKey(
                    tmpl.encryptedKey,
                    privateKey,
                  );
                  let decSubject = tmpl.subject;
                  if (tmpl.subject) {
                    decSubject = await cryptoBrowser.decryptEmailString(
                      tmpl.subject,
                      dataKey,
                    );
                  }
                  const decBody = await cryptoBrowser.decryptEmailString(
                    tmpl.bodyText,
                    dataKey,
                  );
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
  useEffect(() => {
    if (selectedAccountId && accounts.length > 0) {
      const active = accounts.find((a) => a.id === selectedAccountId);
      if (active && active.signatureText) {
        // Only append if signature is not already at the bottom
        const sig = `\n\n--\n${active.signatureText}`;
        setBody((prev) => {
          if (prev.includes(active.signatureText!)) return prev;
          return prev + sig;
        });
      }
    }
  }, [selectedAccountId, accounts]);

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
    setBody((prev) => {
      // Append if body is not empty, otherwise overwrite
      if (prev.trim()) {
        return prev + "\n\n" + tmpl.bodyText;
      }
      return tmpl.bodyText;
    });
    toast.success(`Canned response "${tmpl.name}" inserted!`);
  };

  const executeSendRequest = async (
    finalTo: string,
    finalCc: string,
    finalBcc: string,
  ) => {
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

      toast.success("Email sent successfully!");
      setOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "SMTP delivery failed. Check credentials.");
    } finally {
      setSending(false);
      setUndoTimerToastId(null);
    }
  };

  const handleSend = () => {
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

    // Set up Undo Send (30s delay)
    let secondsLeft = 30;

    // Dismiss previous toast if somehow still there
    if (undoTimerToastId) {
      toast.dismiss(undoTimerToastId);
    }

    const handleCancel = () => {
      if (undoTimeoutRef.current) {
        clearInterval(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
      toast.dismiss(toastId);
      setUndoTimerToastId(null);
      toast.info("Sending cancelled.");
    };

    const handleSendNow = () => {
      if (undoTimeoutRef.current) {
        clearInterval(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
      toast.dismiss(toastId);
      executeSendRequest(finalTo, finalCc, finalBcc);
    };

    // Spawn custom toast
    const toastId = toast.custom(
      (t) => (
        <div className="bg-popover border border-border p-4 rounded-xl flex items-center justify-between gap-4 w-80 shadow-2xl animate-in fade-in duration-200">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground">
              Sending Email...
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              Sending in {secondsLeft} seconds
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendNow}
              className="px-2.5 py-1 text-[10px] bg-success/10 hover:bg-success/20 text-success border border-success/20 rounded-lg transition-all font-medium cursor-pointer"
            >
              Send Now
            </button>
            <button
              onClick={handleCancel}
              className="px-2.5 py-1 text-[10px] bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg transition-all font-medium cursor-pointer"
            >
              Undo
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "bottom-left" },
    );

    setUndoTimerToastId(toastId);

    undoTimeoutRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        if (undoTimeoutRef.current) {
          clearInterval(undoTimeoutRef.current);
          undoTimeoutRef.current = null;
        }
        toast.dismiss(toastId);
        executeSendRequest(finalTo, finalCc, finalBcc);
      } else {
        // Update toast text
        toast.custom(
          (t) => (
            <div className="bg-popover border border-border p-4 rounded-xl flex items-center justify-between gap-4 w-80 shadow-2xl">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-foreground">
                  Sending Email...
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Sending in {secondsLeft} seconds
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendNow}
                  className="px-2.5 py-1 text-[10px] bg-success/10 hover:bg-success/20 text-success border border-success/20 rounded-lg transition-all font-medium animate-pulse cursor-pointer"
                >
                  Send Now
                </button>
                <button
                  onClick={handleCancel}
                  className="px-2.5 py-1 text-[10px] bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg transition-all font-medium cursor-pointer"
                >
                  Undo
                </button>
              </div>
            </div>
          ),
          { id: toastId, duration: Infinity, position: "bottom-left" },
        );
      }
    }, 1000);

    setOpen(false); // Close composing modal immediately
  };

  const handleSaveDraft = async () => {
    if (!selectedAccountId) {
      toast.error("No account selected.");
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

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || "Failed to save draft.");
      }

      toast.success("Draft saved successfully!");
      setOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save draft.");
    } finally {
      setSending(false);
    }
  };

  const handleCloseAttempt = (nextOpen: boolean) => {
    if (!nextOpen) {
      const isFilled =
        toEmails.length > 0 ||
        ccEmails.length > 0 ||
        bccEmails.length > 0 ||
        subject.trim() !== "" ||
        body.trim() !== "";
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
      <DialogContent className="sm:max-w-3xl bg-background border-border shadow-2xl p-0 overflow-hidden flex flex-col h-[80vh] rounded-2xl">
        <DialogTitle className="sr-only">Personal draft</DialogTitle>
        <DialogDescription className="sr-only">
          Compose and edit your email draft.
        </DialogDescription>
        
        {/* Unsaved Changes Confirmation Overlay */}
        {showConfirmClose && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-popover border border-border shadow-2xl rounded-xl p-6 max-w-sm w-full flex flex-col gap-4 text-center">
              <h3 className="text-sm font-semibold text-foreground">Save draft?</h3>
              <p className="text-xs text-muted-foreground">
                You have unsaved changes in this draft. Would you like to save it before closing?
              </p>
              <div className="flex flex-col gap-2 mt-2">
                <Button
                  onClick={() => {
                    setShowConfirmClose(false);
                    handleSaveDraft();
                  }}
                  className="w-full bg-success text-success-foreground hover:bg-success/90 h-9 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Save Draft
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowConfirmClose(false);
                    setOpen(false);
                  }}
                  className="w-full h-9 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Discard Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmClose(false)}
                  className="w-full h-9 text-xs rounded-lg cursor-pointer"
                >
                  Keep Editing
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Personal draft
            </span>
            <span className="text-xs text-muted-foreground/80 font-normal">
              Only visible to you
            </span>
          </div>

        </div>

        {/* Fields Container */}
        <div className="shrink-0 flex flex-col">
          {/* From */}
          <div className="flex items-center min-h-[44px] px-6 border-b border-border/50 gap-4">
            <span className="text-sm text-muted-foreground w-12 shrink-0">
              From:
            </span>
            <Select
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
            >
              <SelectTrigger className="h-7 px-3 py-1 rounded-full border border-border bg-muted/40 text-xs font-semibold text-foreground hover:bg-muted [&_svg]:ml-1.5 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:outline-none">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border backdrop-blur-xl">
                {accounts.map((acc) => (
                  <SelectItem
                    key={acc.id}
                    value={acc.id}
                    className="text-xs focus:bg-accent focus:text-accent-foreground cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: acc.color }}
                      />
                      <span className="font-semibold text-foreground">
                        {acc.accountName}
                      </span>
                      <span className="text-muted-foreground font-normal text-xs">
                        ({acc.emailAddress})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Standard template selector placed here if exists */}
            {templates.length > 0 && (
              <div className="ml-auto">
                <Select
                  onValueChange={(val) => {
                    const matched = templates.find((t) => t.id === val);
                    if (matched) insertTemplate(matched);
                  }}
                >
                  <SelectTrigger className="h-7 bg-background border-border rounded-md text-[11px] font-medium text-foreground">
                    <SelectValue placeholder="Canned Responses" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectGroup>
                      {templates.map((t) => (
                        <SelectItem
                          key={t.id}
                          value={t.id}
                          className="text-xs cursor-pointer focus:bg-accent focus:text-accent-foreground text-foreground"
                        >
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* To */}
          <div className="flex items-start min-h-[44px] py-1.5 px-6 border-b border-border/50 gap-4 bg-background">
            <span className="text-sm text-muted-foreground w-12 shrink-0 pt-1.5">
              To:
            </span>
            <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-[28px]">
              {toEmails.map((email, idx) => (
                <Badge
                  key={email}
                  variant="secondary"
                  className="pl-2.5 pr-1.5 py-0.5 rounded-md text-xs flex items-center gap-1.5 select-none bg-muted/80 text-foreground border-transparent"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() =>
                      setToEmails(toEmails.filter((_, i) => i !== idx))
                    }
                    className="text-muted-foreground hover:text-destructive p-0.5 rounded-sm hover:bg-muted cursor-pointer transition-colors"
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
                  toEmails.length === 0 ? "Type email addresses..." : ""
                }
                className="bg-transparent border-0 border-transparent shadow-none h-7 text-xs text-foreground focus-visible:ring-0 px-0 py-0 flex-1 min-w-[150px] outline-none"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-1.5">
              <button
                onClick={() => setShowCc(!showCc)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors px-1"
              >
                Cc
              </button>
              <button
                onClick={() => setShowBcc(!showBcc)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors px-1"
              >
                Bcc
              </button>
            </div>
          </div>

          {/* Cc */}
          {showCc && (
            <div className="flex items-start min-h-[44px] py-1.5 px-6 border-b border-border/50 gap-4 bg-background animate-in fade-in slide-in-from-top-1 duration-150">
              <span className="text-sm text-muted-foreground w-12 shrink-0 pt-1.5">
                Cc:
              </span>
              <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-[28px]">
                {ccEmails.map((email, idx) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="pl-2.5 pr-1.5 py-0.5 rounded-md text-xs flex items-center gap-1.5 select-none bg-muted/80 text-foreground border-transparent"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() =>
                        setCcEmails(ccEmails.filter((_, i) => i !== idx))
                      }
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded-sm hover:bg-muted cursor-pointer transition-colors"
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
                  className="bg-transparent border-0 border-transparent shadow-none h-7 text-xs text-foreground focus-visible:ring-0 px-0 py-0 flex-1 min-w-[150px] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCc(false);
                  setCcEmails([]);
                  setCcInput("");
                }}
                className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted cursor-pointer transition-colors pt-1.5"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Bcc */}
          {showBcc && (
            <div className="flex items-start min-h-[44px] py-1.5 px-6 border-b border-border/50 gap-4 bg-background animate-in fade-in slide-in-from-top-1 duration-150">
              <span className="text-sm text-muted-foreground w-12 shrink-0 pt-1.5">
                Bcc:
              </span>
              <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-[28px]">
                {bccEmails.map((email, idx) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="pl-2.5 pr-1.5 py-0.5 rounded-md text-xs flex items-center gap-1.5 select-none bg-muted/80 text-foreground border-transparent"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() =>
                        setBccEmails(bccEmails.filter((_, i) => i !== idx))
                      }
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded-sm hover:bg-muted cursor-pointer transition-colors"
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
                  className="bg-transparent border-0 border-transparent shadow-none h-7 text-xs text-foreground focus-visible:ring-0 px-0 py-0 flex-1 min-w-[150px] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBcc(false);
                  setBccEmails([]);
                  setBccInput("");
                }}
                className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted cursor-pointer transition-colors pt-1.5"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center min-h-[44px] px-6 border-b border-border/50 gap-4 bg-background">
            <span className="text-sm text-muted-foreground w-12 shrink-0">
              Subject:
            </span>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject Line"
              className="bg-transparent border-0 border-transparent shadow-none h-8 text-xs font-semibold text-foreground focus-visible:ring-0 px-0 w-full outline-none"
            />
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-background">
          {useMarkdown ? (
            <Tabs defaultValue="write" className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-2 border-b border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
                <TabsList className="bg-muted p-0.5 rounded-lg h-8 border border-border/50">
                  <TabsTrigger
                    value="write"
                    className="text-xs px-3 h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    Write
                  </TabsTrigger>
                  <TabsTrigger
                    value="preview"
                    className="text-xs px-3 h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    Preview
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Markdown Enabled
                  </span>
                  <input
                    id="use-markdown-compose"
                    type="checkbox"
                    checked={useMarkdown}
                    onChange={(e) => setUseMarkdown(e.target.checked)}
                    className="size-3.5 bg-background border-border text-primary rounded-sm cursor-pointer"
                  />
                </div>
              </div>

              <TabsContent
                value="write"
                className="flex-1 flex flex-col min-h-0 focus-visible:outline-none m-0"
              >
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type / to insert a message template or start writing..."
                  style={{
                    fontFamily:
                      fontFamily === "mono"
                        ? "var(--font-mono)"
                        : fontFamily === "serif"
                          ? "var(--font-serif)"
                          : "var(--font-sans)",
                    fontSize: `${fontSize}px`,
                  }}
                  className="flex-1 w-full bg-transparent resize-none p-6 text-sm leading-relaxed text-foreground placeholder-muted-foreground/60 outline-none focus:outline-none"
                />
              </TabsContent>
              <TabsContent
                value="preview"
                className="flex-1 overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none focus-visible:outline-none m-0 bg-muted/5"
              >
                <div className="text-foreground">
                  {body.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {body}
                    </ReactMarkdown>
                  ) : (
                    <em className="text-muted-foreground/60 text-xs">
                      No text written yet. Live preview will appear here.
                    </em>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-2 border-b border-border/40 bg-muted/5 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-muted-foreground/80 font-medium">
                  Type / to insert template
                </span>
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="use-markdown-compose-plain"
                    className="text-[10px] text-muted-foreground font-semibold select-none cursor-pointer"
                  >
                    Markdown Mode
                  </label>
                  <input
                    id="use-markdown-compose-plain"
                    type="checkbox"
                    checked={useMarkdown}
                    onChange={(e) => setUseMarkdown(e.target.checked)}
                    className="size-3.5 bg-background border-border text-primary rounded-sm cursor-pointer"
                  />
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type / to insert a message template or start writing..."
                style={{
                  fontFamily:
                    fontFamily === "mono"
                      ? "var(--font-mono)"
                      : fontFamily === "serif"
                        ? "var(--font-serif)"
                        : "var(--font-sans)",
                  fontSize: `${fontSize}px`,
                }}
                className="flex-1 w-full bg-transparent resize-none p-6 text-sm leading-relaxed text-foreground placeholder-muted-foreground/60 outline-none focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Formatting Toolbar */}
        {showFormatting && (
          <div className="px-6 py-2 border-t border-border flex items-center justify-between shrink-0 bg-muted/10">
            <div className="flex items-center gap-2">
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className="h-7 border border-border bg-background text-xs text-foreground px-2 py-1 rounded-md w-28 [&_svg]:size-3 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0">
                  <SelectValue placeholder="Font Family" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem
                    value="sans"
                    className="text-xs cursor-pointer focus:bg-accent font-sans"
                  >
                    Sans-Serif
                  </SelectItem>
                  <SelectItem
                    value="serif"
                    className="text-xs cursor-pointer focus:bg-accent font-serif"
                  >
                    Serif
                  </SelectItem>
                  <SelectItem
                    value="mono"
                    className="text-xs cursor-pointer focus:bg-accent font-mono"
                  >
                    Monospace
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger className="h-7 border border-border bg-background text-xs text-foreground px-2 py-1 rounded-md w-16 [&_svg]:size-3 shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem
                    value="12"
                    className="text-xs cursor-pointer focus:bg-accent"
                  >
                    12
                  </SelectItem>
                  <SelectItem
                    value="14"
                    className="text-xs cursor-pointer focus:bg-accent"
                  >
                    14
                  </SelectItem>
                  <SelectItem
                    value="16"
                    className="text-xs cursor-pointer focus:bg-accent"
                  >
                    16
                  </SelectItem>
                  <SelectItem
                    value="18"
                    className="text-xs cursor-pointer focus:bg-accent"
                  >
                    18
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => insertFormatting("**", "**")}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Bold"
              >
                <Bold className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("*", "*")}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Italic"
              >
                <Italic className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("<u>", "</u>")}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Underline"
              >
                <Underline className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("~~", "~~")}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Strikethrough"
              >
                <Strikethrough className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n- ")}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Bullet List"
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("[", "](url)")}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Link"
              >
                <LinkIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("![alt](", ")")}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Image"
              >
                <ImageIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n> ")}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Blockquote"
              >
                <Quote className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0 bg-background">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFormatting(!showFormatting)}
              className={cn(
                "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-all",
                showFormatting &&
                  "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary",
              )}
              title="Formatting Options"
            >
              <span className="text-xs font-bold leading-none px-0.5">Aa</span>
            </button>
          </div>

          <div className="flex items-center">
            <Button
              onClick={handleSend}
              disabled={sending}
              className="rounded-l-full rounded-r-none bg-success text-success-foreground hover:bg-success/90 h-8 px-4.5 text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Send
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={sending}
                  className="rounded-r-full rounded-l-none bg-success text-success-foreground hover:bg-success/90 h-8 w-6 px-1 border-l border-success-foreground/20 shadow-sm transition-all focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:outline-none shrink-0 cursor-pointer flex items-center justify-center"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="bg-popover border-border min-w-32"
                align="end"
              >
                <DropdownMenuItem
                  onClick={handleSend}
                  className="text-xs cursor-pointer focus:bg-accent text-foreground"
                >
                  Send
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSaveDraft}
                  className="text-xs cursor-pointer focus:bg-accent text-foreground"
                >
                  Save as Draft
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
