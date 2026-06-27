"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Send, Loader2, Edit, X, Eye, FileText, Check } from "lucide-react";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRRe2ee } from "@/components/Providers/rrE2eeProvider";

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
  const setOpen = isControlled && setControlledOpen ? setControlledOpen : setInternalOpen;

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
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accountId || "");

  // Canned Responses States
  const [templates, setTemplates] = useState<CannedResponse[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  // Undo Send Timer State
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [undoTimerToastId, setUndoTimerToastId] = useState<string | number | null>(null);

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
  }, [open, defaultTo, defaultCc, defaultBcc, defaultSubject, defaultBody, accountId]);

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
            const hasSelection = list.some((acc) => acc.id === selectedAccountId);
            if (!hasSelection) {
              const defaultAcc = list.find((acc) => acc.id === accountId) || list[0];
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
          const rawTemplates: CannedResponse[] = Array.isArray(data) ? data : [];
          const privateKey = await getPrivateKey();
          const cryptoBrowser = privateKey ? await import("@runa/crypto/browser") : null;

          const decrypted = await Promise.all(
            rawTemplates.map(async (tmpl) => {
              if (tmpl.encryptedKey && cryptoBrowser && privateKey) {
                try {
                  const dataKey = await cryptoBrowser.decryptEmailDataKey(tmpl.encryptedKey, privateKey);
                  let decSubject = tmpl.subject;
                  if (tmpl.subject) {
                    decSubject = await cryptoBrowser.decryptEmailString(tmpl.subject, dataKey);
                  }
                  const decBody = await cryptoBrowser.decryptEmailString(tmpl.bodyText, dataKey);
                  return { ...tmpl, subject: decSubject, bodyText: decBody };
                } catch (e) {
                  console.error("Canned response decryption failed:", e);
                  return tmpl;
                }
              }
              return tmpl;
            })
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

  const executeSendRequest = async (finalTo: string, finalCc: string, finalBcc: string) => {
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
          }),
        }
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
      toast.error(`"${trimmedToInput}" in the To field is not a valid email address.`);
      return;
    }

    const finalTo = [...toEmails, ...(trimmedToInput ? [trimmedToInput] : [])].join(", ");
    const finalCc = [...ccEmails, ...(ccInput.trim() ? [ccInput.trim()] : [])].join(", ");
    const finalBcc = [...bccEmails, ...(bccInput.trim() ? [bccInput.trim()] : [])].join(", ");

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
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4 w-80 shadow-2xl">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-zinc-100">Sending Email...</span>
            <span className="text-[10px] text-zinc-500 font-light">Sending in {secondsLeft} seconds</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendNow}
              className="px-2.5 py-1 text-[10px] bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all font-semibold"
            >
              Send Now
            </button>
            <button
              onClick={handleCancel}
              className="px-2.5 py-1 text-[10px] bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg transition-all font-semibold"
            >
              Undo
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "bottom-left" }
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
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between gap-4 w-80 shadow-2xl">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-zinc-100">Sending Email...</span>
                <span className="text-[10px] text-zinc-500 font-light">Sending in {secondsLeft} seconds</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendNow}
                  className="px-2.5 py-1 text-[10px] bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all font-semibold animate-pulse"
                >
                  Send Now
                </button>
                <button
                  onClick={handleCancel}
                  className="px-2.5 py-1 text-[10px] bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg transition-all font-semibold"
                >
                  Undo
                </button>
              </div>
            </div>
          ),
          { id: toastId, duration: Infinity, position: "bottom-left" }
        );
      }
    }, 1000);

    setOpen(false); // Close composing modal immediately
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-4xl bg-zinc-950/90 backdrop-blur-xl border-zinc-800/80 shadow-2xl p-6 rounded-3xl overflow-hidden flex flex-col h-[90vh]">
        <DialogHeader className="border-b border-zinc-800/50 pb-3 flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-zinc-100">
            <Edit className="size-4 text-emerald-500" />
            Markdown Email Composer
          </DialogTitle>
          {templates.length > 0 && (
            <Select onValueChange={(val) => {
              const matched = templates.find(t => t.id === val);
              if (matched) insertTemplate(matched);
            }}>
              <SelectTrigger className="w-44 h-8 bg-zinc-900 border border-zinc-800 rounded-xl text-[11px] font-medium text-zinc-300">
                <SelectValue placeholder="Canned Responses" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
                <SelectGroup>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs cursor-pointer focus:bg-zinc-900 text-zinc-300">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </DialogHeader>

        {/* Inputs */}
        <div className="space-y-2 shrink-0 py-2 border-b border-zinc-800/40">
          <FieldGroup className="flex flex-col gap-1.5 rounded-2xl bg-zinc-950/45 overflow-hidden">
            {/* From */}
            <div className="flex items-center gap-3 px-3 py-1 bg-zinc-900/10 border-b border-zinc-900/60">
              <span className="text-xs font-semibold text-zinc-500 select-none w-10">From</span>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="border-0 bg-transparent shadow-none w-full h-8 text-xs font-semibold text-zinc-200">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950/95 border-zinc-800/80 backdrop-blur-xl">
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs focus:bg-zinc-900 focus:text-zinc-100 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: acc.color }} />
                        <span className="font-semibold text-zinc-200">{acc.accountName}</span>
                        <span className="text-zinc-500 font-normal">({acc.emailAddress})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To */}
            <div className="flex items-center gap-3 px-3 py-1 bg-zinc-900/10 border-b border-zinc-900/60">
              <span className="text-xs font-semibold text-zinc-500 select-none w-10">To</span>
              <div className="flex-1 flex flex-wrap gap-1.5 items-center max-h-24 overflow-y-auto">
                {toEmails.map((email, idx) => (
                  <span key={email} className="bg-zinc-900 border border-zinc-800 text-zinc-200 pl-2 pr-1 py-0.5 rounded-lg text-[10px] flex items-center gap-1 select-none">
                    {email}
                    <button type="button" onClick={() => setToEmails(toEmails.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-400 p-0.5 rounded-md hover:bg-zinc-800 cursor-pointer">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <Input
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={handleToKeyDown}
                  placeholder={toEmails.length === 0 ? "recipient@example.com" : ""}
                  className="bg-transparent border-0 border-transparent shadow-none h-7 text-xs text-zinc-200 focus-visible:ring-0 px-1 py-0 flex-1 min-w-[120px]"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!showCc && <button onClick={() => setShowCc(true)} className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 px-1">Cc</button>}
                {!showBcc && <button onClick={() => setShowBcc(true)} className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 px-1">Bcc</button>}
              </div>
            </div>

            {/* Cc */}
            {showCc && (
              <div className="flex items-center gap-3 px-3 py-1 bg-zinc-900/10 border-b border-zinc-900/60">
                <span className="text-xs font-semibold text-zinc-500 select-none w-10">Cc</span>
                <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                  {ccEmails.map((email, idx) => (
                    <span key={email} className="bg-zinc-900 border border-zinc-800 text-zinc-200 pl-2 pr-1 py-0.5 rounded-lg text-[10px] flex items-center gap-1 select-none">
                      {email}
                      <button type="button" onClick={() => setCcEmails(ccEmails.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-400 p-0.5 rounded-md hover:bg-zinc-800 cursor-pointer">
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <Input
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={handleCcKeyDown}
                    placeholder="cc@example.com"
                    className="bg-transparent border-0 border-transparent shadow-none h-7 text-xs text-zinc-200 focus-visible:ring-0 px-1 py-0 flex-1 min-w-[120px]"
                  />
                </div>
              </div>
            )}

            {/* Bcc */}
            {showBcc && (
              <div className="flex items-center gap-3 px-3 py-1 bg-zinc-900/10 border-b border-zinc-900/60">
                <span className="text-xs font-semibold text-zinc-500 select-none w-10">Bcc</span>
                <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                  {bccEmails.map((email, idx) => (
                    <span key={email} className="bg-zinc-900 border border-zinc-800 text-zinc-200 pl-2 pr-1 py-0.5 rounded-lg text-[10px] flex items-center gap-1 select-none">
                      {email}
                      <button type="button" onClick={() => setBccEmails(bccEmails.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-400 p-0.5 rounded-md hover:bg-zinc-800 cursor-pointer">
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <Input
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    onKeyDown={handleBccKeyDown}
                    placeholder="bcc@example.com"
                    className="bg-transparent border-0 border-transparent shadow-none h-7 text-xs text-zinc-200 focus-visible:ring-0 px-1 py-0 flex-1 min-w-[120px]"
                  />
                </div>
              </div>
            )}

            {/* Subject */}
            <div className="flex items-center gap-3 px-3 py-1">
              <span className="text-xs font-semibold text-zinc-500 select-none w-10">Subject</span>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject Line"
                className="bg-transparent border-0 border-transparent shadow-none h-8 text-xs font-medium text-zinc-200 focus-visible:ring-0 px-1"
              />
            </div>
          </FieldGroup>
        </div>

        {/* Dual-Pane Editor Panels */}
        <div className="flex-1 flex gap-4 min-h-0 py-4">
          {/* Editor Pane (Left) */}
          <div className="flex-1 flex flex-col space-y-1.5 min-h-0">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">
              <span>Markdown Input</span>
              <span className="text-zinc-600 font-normal">Supports GFM, headers, lists</span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here in Markdown... (e.g. # Hello, **bold**, *italic*)"
              className="flex-1 w-full bg-zinc-950 border border-zinc-900 rounded-2xl resize-none p-4 text-xs/relaxed text-zinc-200 placeholder-zinc-700 outline-none focus:border-zinc-800 transition-colors font-mono"
            />
          </div>

          {/* HTML Preview Pane (Right) */}
          <div className="flex-1 flex flex-col space-y-1.5 min-h-0 border-l border-zinc-900 pl-4">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">
              <span className="flex items-center gap-1">
                <Eye className="size-3" />
                Live HTML Preview
              </span>
            </div>
            <div className="flex-1 w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-4 overflow-y-auto no-scrollbar prose prose-invert max-w-none text-xs leading-relaxed text-zinc-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {body || "*No text written yet. Live preview will appear here.*"}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 shrink-0 pt-4 border-t border-zinc-800/50">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
            className="rounded-xl border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="min-w-[100px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:shadow-[0_0_16px_rgba(16,185,129,0.3)] cursor-pointer text-xs flex items-center justify-center gap-1.5 font-bold"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
