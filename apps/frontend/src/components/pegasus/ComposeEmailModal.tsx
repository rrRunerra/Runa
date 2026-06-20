"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Send, Loader2, Edit, X } from "lucide-react";
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

interface ComposeEmailModalProps {
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
}

export function ComposeEmailModal({
  children,
  accountId,
  defaultTo = "",
  defaultCc = "",
  defaultBcc = "",
  defaultSubject = "",
  defaultBody = "",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ComposeEmailModalProps): React.JSX.Element {
  const { data: session } = useSession();
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

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      // Parse defaultTo
      const initialTo = defaultTo
        ? defaultTo
            .split(/[,;\s]+/)
            .map((em) => em.trim())
            .filter(Boolean)
        : [];
      setToEmails(initialTo);
      setToInput("");

      // Parse defaultCc
      const initialCc = defaultCc
        ? defaultCc
            .split(/[,;\s]+/)
            .map((em) => em.trim())
            .filter(Boolean)
        : [];
      setCcEmails(initialCc);
      setCcInput("");

      // Parse defaultBcc
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

  // Fetch accounts when modal is open and session is available
  React.useEffect(() => {
    if (open && session?.accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to fetch email accounts");
          const data: unknown = await res.json();
          return data;
        })
        .then((data) => {
          const list: EmailAccount[] = [];
          if (Array.isArray(data)) {
            for (const item of data) {
              if (
                item &&
                typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.accountName === "string" &&
                typeof item.emailAddress === "string" &&
                typeof item.color === "string"
              ) {
                list.push({
                  id: item.id,
                  accountName: item.accountName,
                  emailAddress: item.emailAddress,
                  color: item.color,
                });
              }
            }
          }
          setAccounts(list);
          if (list.length > 0) {
            const hasSelection = list.some((acc) => acc.id === selectedAccountId);
            if (!hasSelection) {
              const defaultAcc = list.find((acc) => acc.id === accountId) || list[0];
              setSelectedAccountId(defaultAcc.id);
            }
          }
        })
        .catch((err: unknown) => {
          console.error("Failed to fetch accounts in compose modal", err);
        });
    }
  }, [open, session?.accessToken, accountId, selectedAccountId]);

  // Key handlers for To field
  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const val = toInput.trim().replace(/,$/, "");
      if (val) {
        if (isValidEmail(val)) {
          if (!toEmails.includes(val)) {
            setToEmails([...toEmails, val]);
          }
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

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.endsWith(",") || val.endsWith(" ")) {
      const email = val.slice(0, -1).trim();
      if (email) {
        if (isValidEmail(email)) {
          if (!toEmails.includes(email)) {
            setToEmails([...toEmails, email]);
          }
          setToInput("");
        } else {
          toast.error(`"${email}" is not a valid email address.`);
        }
      } else {
        setToInput("");
      }
    } else {
      setToInput(val);
    }
  };

  const handleToPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const parts = pasteData.split(/[,;\s]+/);
    const validEmails: string[] = [];
    let hasInvalid = false;

    for (const part of parts) {
      const em = part.trim();
      if (em) {
        if (isValidEmail(em)) {
          if (!toEmails.includes(em) && !validEmails.includes(em)) {
            validEmails.push(em);
          }
        } else {
          hasInvalid = true;
        }
      }
    }

    if (validEmails.length > 0) {
      setToEmails([...toEmails, ...validEmails]);
    }
    if (hasInvalid) {
      toast.error("Some invalid email addresses were skipped.");
    }
  };

  // Key handlers for Cc field
  const handleCcKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const val = ccInput.trim().replace(/,$/, "");
      if (val) {
        if (isValidEmail(val)) {
          if (!ccEmails.includes(val)) {
            setCcEmails([...ccEmails, val]);
          }
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

  const handleCcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.endsWith(",") || val.endsWith(" ")) {
      const email = val.slice(0, -1).trim();
      if (email) {
        if (isValidEmail(email)) {
          if (!ccEmails.includes(email)) {
            setCcEmails([...ccEmails, email]);
          }
          setCcInput("");
        } else {
          toast.error(`"${email}" is not a valid email address.`);
        }
      } else {
        setCcInput("");
      }
    } else {
      setCcInput(val);
    }
  };

  const handleCcPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const parts = pasteData.split(/[,;\s]+/);
    const validEmails: string[] = [];
    let hasInvalid = false;

    for (const part of parts) {
      const em = part.trim();
      if (em) {
        if (isValidEmail(em)) {
          if (!ccEmails.includes(em) && !validEmails.includes(em)) {
            validEmails.push(em);
          }
        } else {
          hasInvalid = true;
        }
      }
    }

    if (validEmails.length > 0) {
      setCcEmails([...ccEmails, ...validEmails]);
    }
    if (hasInvalid) {
      toast.error("Some invalid email addresses were skipped.");
    }
  };

  // Key handlers for Bcc field
  const handleBccKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const val = bccInput.trim().replace(/,$/, "");
      if (val) {
        if (isValidEmail(val)) {
          if (!bccEmails.includes(val)) {
            setBccEmails([...bccEmails, val]);
          }
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

  const handleBccChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.endsWith(",") || val.endsWith(" ")) {
      const email = val.slice(0, -1).trim();
      if (email) {
        if (isValidEmail(email)) {
          if (!bccEmails.includes(email)) {
            setBccEmails([...bccEmails, email]);
          }
          setBccInput("");
        } else {
          toast.error(`"${email}" is not a valid email address.`);
        }
      } else {
        setBccInput("");
      }
    } else {
      setBccInput(val);
    }
  };

  const handleBccPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const parts = pasteData.split(/[,;\s]+/);
    const validEmails: string[] = [];
    let hasInvalid = false;

    for (const part of parts) {
      const em = part.trim();
      if (em) {
        if (isValidEmail(em)) {
          if (!bccEmails.includes(em) && !validEmails.includes(em)) {
            validEmails.push(em);
          }
        } else {
          hasInvalid = true;
        }
      }
    }

    if (validEmails.length > 0) {
      setBccEmails([...bccEmails, ...validEmails]);
    }
    if (hasInvalid) {
      toast.error("Some invalid email addresses were skipped.");
    }
  };

  const handleSend = async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error("You must be logged in to send emails.");
      return;
    }
    if (!selectedAccountId) {
      toast.error("No email account selected.");
      return;
    }

    const trimmedToInput = toInput.trim();
    if (trimmedToInput) {
      if (!isValidEmail(trimmedToInput)) {
        toast.error(`"${trimmedToInput}" in the To field is not a valid email address.`);
        return;
      }
    }

    const trimmedCcInput = ccInput.trim();
    if (showCc && trimmedCcInput) {
      if (!isValidEmail(trimmedCcInput)) {
        toast.error(`"${trimmedCcInput}" in the Cc field is not a valid email address.`);
        return;
      }
    }

    const trimmedBccInput = bccInput.trim();
    if (showBcc && trimmedBccInput) {
      if (!isValidEmail(trimmedBccInput)) {
        toast.error(`"${trimmedBccInput}" in the Bcc field is not a valid email address.`);
        return;
      }
    }

    const finalTo = [...toEmails, ...(trimmedToInput ? [trimmedToInput] : [])].join(", ");
    const finalCc = [...ccEmails, ...(trimmedCcInput ? [trimmedCcInput] : [])].join(", ");
    const finalBcc = [...bccEmails, ...(trimmedBccInput ? [trimmedBccInput] : [])].join(", ");

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
            Authorization: `Bearer ${session.accessToken}`,
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
        const errorData: unknown = await res.json().catch(() => ({}));
        let errorMessage = "Failed to send email.";
        if (errorData && typeof errorData === "object") {
          const obj = errorData as Record<string, unknown>;
          if (typeof obj.message === "string") {
            errorMessage = obj.message;
          }
        }
        throw new Error(errorMessage);
      }

      toast.success("Email sent successfully!");
      setOpen(false);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "SMTP delivery failed. Check credentials.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl bg-zinc-950/90 backdrop-blur-xl border-zinc-800/80 shadow-2xl p-6 rounded-3xl">
        <DialogHeader className="border-b border-zinc-800/50 pb-3">
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-zinc-100">
            <Edit className="size-4 text-emerald-500" />
            New Message
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <FieldGroup className="flex flex-col gap-0 border border-zinc-800/80 rounded-2xl bg-zinc-950/45 overflow-hidden">
            {/* From Selector */}
            <Field className="flex flex-col gap-1.5 border-b border-zinc-800/40 py-2.5 px-3 w-full">
              <FieldLabel className="text-xs font-semibold text-zinc-500 select-none">
                From
              </FieldLabel>
              {accounts.length === 0 ? (
                <div className="h-9 w-full bg-zinc-900/50 animate-pulse rounded-xl border border-zinc-800/60" />
              ) : (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-full h-9 bg-zinc-900/30 dark:bg-zinc-900/30 border border-zinc-800/60 hover:bg-zinc-805 transition-colors rounded-xl px-3 gap-2 justify-start focus-visible:ring-2 focus-visible:ring-ring/30 select-none text-left">
                    <SelectValue placeholder="Select sender account">
                      {(() => {
                        const active = accounts.find((a) => a.id === selectedAccountId);
                        if (!active) return "Select sender account";
                        return (
                          <div className="flex items-center gap-2">
                            <span
                              className="size-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: active.color || "#10b981" }}
                            />
                            <span className="font-semibold text-zinc-200">{active.accountName}</span>
                            <span className="text-zinc-400 font-normal">({active.emailAddress})</span>
                          </div>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950/95 border-zinc-800/80 backdrop-blur-xl">
                    <SelectGroup>
                      {accounts.map((acc) => (
                        <SelectItem
                          key={acc.id}
                          value={acc.id}
                          className="text-xs focus:bg-zinc-900 focus:text-zinc-100 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="size-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: acc.color || "#10b981" }}
                            />
                            <span className="font-semibold text-zinc-200">{acc.accountName}</span>
                            <span className="text-zinc-500 font-normal">({acc.emailAddress})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </Field>

            {/* To Row */}
            <Field className="flex flex-col gap-1.5 border-b border-zinc-800/40 py-2.5 px-3 w-full">
              <div className="flex items-center justify-between w-full">
                <FieldLabel className="text-xs font-semibold text-zinc-500 select-none">
                  To
                </FieldLabel>
                <div className="flex items-center gap-1.5">
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 bg-zinc-900/50 hover:bg-emerald-950/30 border border-zinc-800 hover:border-emerald-900/50 rounded-md px-1.5 py-0.5 transition-all select-none cursor-pointer font-sans shrink-0"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 bg-zinc-900/50 hover:bg-emerald-950/30 border border-zinc-800 hover:border-emerald-900/50 rounded-md px-1.5 py-0.5 transition-all select-none cursor-pointer font-sans shrink-0"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full flex flex-wrap gap-1.5 items-center min-h-[36px] bg-zinc-900/30 dark:bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-1.5 focus-within:border-zinc-700/80 transition-colors">
                <AnimatePresence>
                  {toEmails.map((email, idx) => (
                    <motion.div
                      key={email}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.12 }}
                      className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-805 text-zinc-200 pl-2 pr-1 py-0.5 rounded-lg text-xs flex items-center gap-1 transition-all select-none max-w-full truncate"
                    >
                      <span className="truncate">{email}</span>
                      <button
                        type="button"
                        onClick={() => setToEmails(toEmails.filter((_, i) => i !== idx))}
                        className="text-zinc-400 hover:text-red-400 p-0.5 rounded-md hover:bg-zinc-700/60 transition-colors cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <Input
                  value={toInput}
                  onChange={handleToChange}
                  onKeyDown={handleToKeyDown}
                  onPaste={handleToPaste}
                  placeholder={toEmails.length === 0 ? "recipient1@example.com, recipient2@example.com" : ""}
                  className="bg-transparent dark:bg-transparent border-0 border-transparent shadow-none h-7 text-xs/relaxed text-zinc-200 placeholder-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-0 min-w-[120px] flex-1"
                />
              </div>
            </Field>

            {/* Cc Row */}
            <AnimatePresence initial={false}>
              {showCc && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden w-full"
                >
                  <Field className="flex flex-col gap-1.5 border-b border-zinc-800/40 py-2.5 px-3 w-full">
                    <div className="flex items-center justify-between w-full">
                      <FieldLabel className="text-xs font-semibold text-zinc-500 select-none">
                        Cc
                      </FieldLabel>
                      <button
                        type="button"
                        onClick={() => {
                          setCcEmails([]);
                          setCcInput("");
                          setShowCc(false);
                        }}
                        className="text-[10px] font-bold text-zinc-500 hover:text-red-400 bg-zinc-900/50 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/50 rounded-md px-1.5 py-0.5 transition-all select-none cursor-pointer font-sans shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="w-full flex flex-wrap gap-1.5 items-center min-h-[36px] bg-zinc-900/30 dark:bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-1.5 focus-within:border-zinc-700/80 transition-colors">
                      <AnimatePresence>
                        {ccEmails.map((email, idx) => (
                          <motion.div
                            key={email}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.12 }}
                            className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-805 text-zinc-200 pl-2 pr-1 py-0.5 rounded-lg text-xs flex items-center gap-1 transition-all select-none max-w-full truncate"
                          >
                            <span className="truncate">{email}</span>
                            <button
                              type="button"
                              onClick={() => setCcEmails(ccEmails.filter((_, i) => i !== idx))}
                              className="text-zinc-400 hover:text-red-400 p-0.5 rounded-md hover:bg-zinc-700/60 transition-colors cursor-pointer"
                            >
                              <X className="size-3" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <Input
                        value={ccInput}
                        onChange={handleCcChange}
                        onKeyDown={handleCcKeyDown}
                        onPaste={handleCcPaste}
                        placeholder={ccEmails.length === 0 ? "cc1@example.com, cc2@example.com" : ""}
                        className="bg-transparent dark:bg-transparent border-0 border-transparent shadow-none h-7 text-xs/relaxed text-zinc-200 placeholder-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-0 min-w-[120px] flex-1"
                      />
                    </div>
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bcc Row */}
            <AnimatePresence initial={false}>
              {showBcc && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden w-full"
                >
                  <Field className="flex flex-col gap-1.5 border-b border-zinc-800/40 py-2.5 px-3 w-full">
                    <div className="flex items-center justify-between w-full">
                      <FieldLabel className="text-xs font-semibold text-zinc-500 select-none">
                        Bcc
                      </FieldLabel>
                      <button
                        type="button"
                        onClick={() => {
                          setBccEmails([]);
                          setBccInput("");
                          setShowBcc(false);
                        }}
                        className="text-[10px] font-bold text-zinc-500 hover:text-red-400 bg-zinc-900/50 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/50 rounded-md px-1.5 py-0.5 transition-all select-none cursor-pointer font-sans shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="w-full flex flex-wrap gap-1.5 items-center min-h-[36px] bg-zinc-900/30 dark:bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-1.5 focus-within:border-zinc-700/80 transition-colors">
                      <AnimatePresence>
                        {bccEmails.map((email, idx) => (
                          <motion.div
                            key={email}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.12 }}
                            className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-805 text-zinc-200 pl-2 pr-1 py-0.5 rounded-lg text-xs flex items-center gap-1 transition-all select-none max-w-full truncate"
                          >
                            <span className="truncate">{email}</span>
                            <button
                              type="button"
                              onClick={() => setBccEmails(bccEmails.filter((_, i) => i !== idx))}
                              className="text-zinc-400 hover:text-red-400 p-0.5 rounded-md hover:bg-zinc-700/60 transition-colors cursor-pointer"
                            >
                              <X className="size-3" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <Input
                        value={bccInput}
                        onChange={handleBccChange}
                        onKeyDown={handleBccKeyDown}
                        onPaste={handleBccPaste}
                        placeholder={bccEmails.length === 0 ? "bcc1@example.com, bcc2@example.com" : ""}
                        className="bg-transparent dark:bg-transparent border-0 border-transparent shadow-none h-7 text-xs/relaxed text-zinc-200 placeholder-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-0 min-w-[120px] flex-1"
                      />
                    </div>
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subject Row */}
            <Field className="flex flex-col gap-1.5 border-b border-zinc-800/40 py-2.5 px-3 w-full">
              <FieldLabel className="text-xs font-semibold text-zinc-500 select-none">
                Subject
              </FieldLabel>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Message Subject"
                className="w-full bg-zinc-900/30 dark:bg-zinc-900/30 border border-zinc-800/60 rounded-xl h-9 text-xs/relaxed text-zinc-200 placeholder-zinc-600 focus-visible:border-zinc-700/80 focus-visible:ring-2 focus-visible:ring-ring/30 shadow-none px-3"
              />
            </Field>

            {/* Message Body Field */}
            <Field className="flex flex-col gap-2 p-3 w-full min-h-[220px]">
              <FieldLabel className="sr-only">
                Message
              </FieldLabel>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                className="bg-transparent border-0 resize-none flex-1 text-xs/relaxed text-zinc-200 placeholder-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-1.5 min-h-[200px] w-full outline-hidden font-sans"
              />
            </Field>
          </FieldGroup>
        </div>
        <div className="flex justify-end gap-3 mt-4">
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
            className="min-w-[100px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:shadow-[0_0_16px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            {sending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}





