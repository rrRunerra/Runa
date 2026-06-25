"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useFetch } from "@/hooks/useFetch";
import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RrMailSettingsTabProps {
  onOpenChange: (open: boolean) => void;
}

export function RrMailSettingsTab({ onOpenChange }: RrMailSettingsTabProps): React.JSX.Element {
  const { data: session } = useSession();

  // Email Accounts States
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [isEmailAccountDialogOpen, setIsEmailAccountDialogOpen] = useState<boolean>(false);
  const [editingEmailAccount, setEditingEmailAccount] = useState<any | null>(null);

  // Email Account Fields
  const [emailAccountName, setEmailAccountName] = useState<string>("");
  const [emailColor, setEmailColor] = useState<string>("#8B00FF");
  const [emailSenderName, setEmailSenderName] = useState<string>("");
  const [emailAddressField, setEmailAddressField] = useState<string>("");
  const [emailLoginField, setEmailLoginField] = useState<string>("");
  const [emailReplyTo, setEmailReplyTo] = useState<string>("");
  const [emailOrganization, setEmailOrganization] = useState<string>("");
  const [emailSignature, setEmailSignature] = useState<string>("");
  const [emailUseHtmlSig, setEmailUseHtmlSig] = useState<boolean>(false);
  const [emailPassword, setEmailPassword] = useState<string>("");

  const [imapHost, setImapHost] = useState<string>("imap.purelymail.com");
  const [imapPort, setImapPort] = useState<string>("993");
  const [imapSecure, setImapSecure] = useState<boolean>(true);

  const [smtpHost, setSmtpHost] = useState<string>("smtp.purelymail.com");
  const [smtpPort, setSmtpPort] = useState<string>("465");
  const [smtpSecure, setSmtpSecure] = useState<boolean>(true);

  const { data: emailAccountsData, refetch: refetchEmailAccounts } = useFetch<any[]>(
    session?.accessToken ? `${process.env.NEXT_PUBLIC_API_URL}/emails` : "",
    {
      headers: { Authorization: `Bearer ${session?.accessToken}` },
      enabled: !!session?.accessToken,
    }
  );

  useEffect(() => {
    if (emailAccountsData) {
      setEmailAccounts(Array.isArray(emailAccountsData) ? emailAccountsData : []);
    }
  }, [emailAccountsData]);

  const fetchEmailAccounts = (): void => {
    refetchEmailAccounts();
  };

  const handleSaveEmailAccount = async (): Promise<void> => {
    if (!session?.accessToken) return;

    const finalEmailAddress = emailAddressField.trim() || emailLoginField.trim();

    const payload = {
      accountName: emailAccountName,
      color: emailColor,
      senderName: emailSenderName,
      emailAddress: finalEmailAddress,
      loginEmail: emailLoginField.trim() || null,
      replyToAddress: emailReplyTo.trim() || null,
      organization: emailOrganization.trim() || null,
      signatureText: emailSignature || null,
      useHtmlSignature: emailUseHtmlSig,
      password: emailPassword,
      imapHost,
      imapPort: parseInt(imapPort, 10),
      imapSecure,
      smtpHost,
      smtpPort: parseInt(smtpPort, 10),
      smtpSecure,
    };

    try {
      let res;
      if (editingEmailAccount) {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails/${editingEmailAccount.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast.success(editingEmailAccount ? "Email account updated" : "Email account added");
        setIsEmailAccountDialogOpen(false);
        fetchEmailAccounts();
        resetEmailForm();
        window.dispatchEvent(new CustomEvent("runa-sidebar-changed"));
      } else {
        throw new Error("Failed to save email account");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save account details.");
    }
  };

  const handleDeleteEmailAccount = async (id: string): Promise<void> => {
    if (!session?.accessToken) return;
    if (!window.confirm("Are you sure you want to remove this email account?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/emails/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        toast.success("Email account removed");
        fetchEmailAccounts();
        window.dispatchEvent(new CustomEvent("runa-sidebar-changed"));
      } else {
        throw new Error("Failed to delete email account");
      }
    } catch (err: any) {
      toast.error(err.message || "Delete failed.");
    }
  };

  const resetEmailForm = (): void => {
    setEditingEmailAccount(null);
    setEmailAccountName("");
    setEmailColor("#8B00FF");
    setEmailSenderName("");
    setEmailAddressField("");
    setEmailLoginField("");
    setEmailReplyTo("");
    setEmailOrganization("");
    setEmailSignature("");
    setEmailUseHtmlSig(false);
    setEmailPassword("");
    setImapHost("imap.purelymail.com");
    setImapPort("993");
    setImapSecure(true);
    setSmtpHost("smtp.purelymail.com");
    setSmtpPort("465");
    setSmtpSecure(true);
  };

  const handleAutodetect = async (): Promise<void> => {
    const autodetectEmail = emailLoginField || emailAddressField;
    if (!autodetectEmail || !autodetectEmail.includes("@")) {
      toast.error("Please enter a valid email address first.");
      return;
    }
    const domain = autodetectEmail.split("@")[1].toLowerCase().trim();
    if (!domain) return;

    if (!session?.accessToken) {
      toast.error("Session authentication required.");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails/autoconfig/${domain}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });

      if (res.ok) {
        const config = await res.json();
        setImapHost(config.imapHost || `imap.${domain}`);
        setImapPort(config.imapPort ? String(config.imapPort) : "993");
        setImapSecure(config.imapSecure !== false);
        setSmtpHost(config.smtpHost || `smtp.${domain}`);
        setSmtpPort(config.smtpPort ? String(config.smtpPort) : "465");
        setSmtpSecure(config.smtpSecure !== false);

        toast.success(`Server settings auto-filled for ${domain}!`);
      } else {
        throw new Error("Failed to autodetect configurations.");
      }
    } catch (err) {
      console.error("Autodetect error:", err);
      toast.error("Could not autodetect settings. Using generic defaults.");
      
      setImapHost(`imap.${domain}`);
      setImapPort("993");
      setImapSecure(true);
      setSmtpHost(`smtp.${domain}`);
      setSmtpPort("465");
      setSmtpSecure(true);
    }
  };

  const openEditEmailAccount = (account: any): void => {
    setEditingEmailAccount(account);
    setEmailAccountName(account.accountName);
    setEmailColor(account.color);
    setEmailSenderName(account.senderName);
    setEmailAddressField(account.emailAddress);
    setEmailLoginField(account.loginEmail || "");
    setEmailReplyTo(account.replyToAddress || "");
    setEmailOrganization(account.organization || "");
    setEmailSignature(account.signatureText || "");
    setEmailUseHtmlSig(account.useHtmlSignature);
    setEmailPassword(account.password || "");
    setImapHost(account.imapHost);
    setImapPort(String(account.imapPort));
    setImapSecure(account.imapSecure);
    setSmtpHost(account.smtpHost);
    setSmtpPort(String(account.smtpPort));
    setSmtpSecure(account.smtpSecure);
    setIsEmailAccountDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/40">
        <div className="space-y-0.5">
          <CardTitle>Linked Email Accounts</CardTitle>
          <CardDescription>
            Add multiple email addresses and configure IMAP/SMTP credentials.
          </CardDescription>
        </div>
        <Button
          onClick={() => { resetEmailForm(); setIsEmailAccountDialogOpen(true); }}
          className="h-8 rounded-lg cursor-pointer"
        >
          <Plus className="size-3.5 mr-1" />
          Link Email Account
        </Button>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
        {emailAccounts.map((account) => (
          <div
            key={account.id}
            className="p-4 rounded-xl border border-border bg-card/40 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="space-y-0.5 text-left min-w-0">
                <span className="text-xs font-bold text-foreground block truncate">
                  {account.accountName}
                </span>
                <span className="text-[10px] text-muted-foreground block truncate">
                  {account.emailAddress}
                  {account.loginEmail && account.loginEmail !== account.emailAddress && (
                    <span className="text-muted-foreground/50"> · login: {account.loginEmail}</span>
                  )}
                </span>
                <span className="text-[9px] text-muted-foreground/60 block truncate">
                  IMAP: {account.imapHost} | SMTP: {account.smtpHost}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                onClick={() => openEditEmailAccount(account)}
                variant="ghost"
                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-foreground hover:bg-muted"
              >
                Edit
              </Button>
              <Button
                onClick={() => handleDeleteEmailAccount(account.id)}
                variant="ghost"
                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <Trash className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {emailAccounts.length === 0 && (
          <div className="col-span-full p-6 text-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            No linked email accounts found. Add one to get started!
          </div>
        )}
      </CardContent>

      {/* Done Closing button */}
      <CardFooter className="flex justify-end pt-4 border-t border-border mt-6">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="text-xs sm:text-sm h-9 px-5 rounded-xl cursor-pointer"
        >
          Close Settings
        </Button>
      </CardFooter>

      {/* Thunderbird Email Setup Dialog */}
      <Dialog open={isEmailAccountDialogOpen} onOpenChange={setIsEmailAccountDialogOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl bg-card border border-border shadow-2xl p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="text-md font-bold">
              {editingEmailAccount ? "Edit Email Account" : "Link Email Account"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Configure your display identity and mail server connection credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4 text-left">
            {/* Identity & Aesthetics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                  id="account-name"
                  value={emailAccountName}
                  onChange={(e) => setEmailAccountName(e.target.value)}
                  placeholder="e.g. Personal Purelymail"
                  className="h-9 px-3 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account-color">Sidebar Indicator Color</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="size-9 rounded-lg border border-zinc-800/80 shadow-inner shrink-0 transition-colors"
                    style={{ backgroundColor: emailColor }}
                  />
                  <Input
                    id="account-color"
                    type="color"
                    value={emailColor}
                    onChange={(e) => setEmailColor(e.target.value)}
                    className="h-9 w-14 p-0.5 bg-zinc-900 border-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex gap-1.5 items-center overflow-x-auto py-1">
                    {["#8B00FF", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#6366F1"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEmailColor(c)}
                        className={cn(
                          "size-5 rounded-full border border-black/40 cursor-pointer transition-all hover:scale-110 shrink-0",
                          emailColor === c && "ring-1 ring-primary ring-offset-1 ring-offset-zinc-950"
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Select color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1 mt-1">
              <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Default Identity</h5>
              <p className="text-[10px] text-muted-foreground/60">Information recipients see when reading your messages.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sender-name">Your Name</Label>
                <Input
                  id="sender-name"
                  value={emailSenderName}
                  onChange={(e) => setEmailSenderName(e.target.value)}
                  placeholder="e.g. Yki"
                  className="h-9 px-3 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-address-field">Email Address</Label>
                <Input
                  id="email-address-field"
                  value={emailAddressField}
                  onChange={(e) => setEmailAddressField(e.target.value)}
                  placeholder="e.g. yuki@runerra.org"
                  className="h-9 px-3 text-xs"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  The address recipients see in the From field.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reply-to">Reply-to Address (Optional)</Label>
                <Input
                  id="reply-to"
                  value={emailReplyTo}
                  onChange={(e) => setEmailReplyTo(e.target.value)}
                  placeholder="Alternative reply destination"
                  className="h-9 px-3 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="organization">Organization (Optional)</Label>
                <Input
                  id="organization"
                  value={emailOrganization}
                  onChange={(e) => setEmailOrganization(e.target.value)}
                  placeholder="e.g. Runa Dev Group"
                  className="h-9 px-3 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-signature">Signature Text</Label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="use-html"
                    type="checkbox"
                    checked={emailUseHtmlSig}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailUseHtmlSig(e.target.checked)}
                    className="size-3.5 bg-background border-border text-primary rounded-xs cursor-pointer"
                  />
                  <Label htmlFor="use-html" className="text-[10px] cursor-pointer">Use HTML formatting</Label>
                </div>
              </div>
              <textarea
                id="email-signature"
                value={emailSignature}
                onChange={(e) => setEmailSignature(e.target.value)}
                placeholder="Add your mail signature text..."
                className="w-full min-h-[70px] p-3 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground font-sans"
              />
            </div>

            <div className="flex items-center justify-between mt-1">
              <div className="space-y-1">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Server Settings</h5>
              </div>
              <Button
                type="button"
                onClick={handleAutodetect}
                variant="outline"
                className="h-7 rounded-lg border border-border hover:bg-muted text-[10px] px-2.5 font-semibold shrink-0 cursor-pointer"
              >
                Autodetect
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Login Email (Authentication)</Label>
                <Input
                  id="login-email"
                  value={emailLoginField}
                  onChange={(e) => setEmailLoginField(e.target.value)}
                  placeholder={emailAddressField || "e.g. yki@runerra.org"}
                  className="h-9 px-3 text-xs"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  IMAP/SMTP login username. Leave blank to use the identity email above.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-password">Account Password</Label>
                <Input
                  id="email-password"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="SMTP/IMAP server password"
                  className="h-9 px-3 text-xs"
                />
              </div>
            </div>

            {/* IMAP & SMTP Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-border bg-muted/40">
              {/* Incoming IMAP */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Incoming (IMAP)</span>
                <div className="space-y-1.5">
                  <Label htmlFor="imap-host">Server Hostname</Label>
                  <Input
                    id="imap-host"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.purelymail.com"
                    className="h-8 px-2.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="imap-port">Port</Label>
                    <Input
                      id="imap-port"
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                      placeholder="993"
                      className="h-8 px-2.5 text-xs"
                    />
                  </div>
                  <div className="flex flex-col justify-center gap-1.5 pt-4">
                    <div className="flex items-center gap-1.5">
                      <input
                        id="imap-secure"
                        type="checkbox"
                        checked={imapSecure}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImapSecure(e.target.checked)}
                        className="size-3.5 bg-background border-border text-primary rounded-xs cursor-pointer"
                      />
                      <Label htmlFor="imap-secure" className="text-[10px] cursor-pointer">SSL/TLS</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outgoing SMTP */}
              <div className="space-y-3.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Outgoing (SMTP)</span>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-host">Server Hostname</Label>
                  <Input
                    id="smtp-host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.purelymail.com"
                    className="h-8 px-2.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input
                      id="smtp-port"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="465"
                      className="h-8 px-2.5 text-xs"
                    />
                  </div>
                  <div className="flex flex-col justify-center gap-1.5 pt-4">
                    <div className="flex items-center gap-1.5">
                      <input
                        id="smtp-secure"
                        type="checkbox"
                        checked={smtpSecure}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmtpSecure(e.target.checked)}
                        className="size-3.5 bg-background border-border text-primary rounded-xs cursor-pointer"
                      />
                      <Label htmlFor="smtp-secure" className="text-[10px] cursor-pointer">SSL/TLS</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setIsEmailAccountDialogOpen(false)}
              className="text-muted-foreground hover:text-foreground rounded-xl text-xs h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEmailAccount}
              disabled={!emailAccountName || (!emailAddressField.trim() && !emailLoginField.trim()) || !emailPassword}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
            >
              {editingEmailAccount ? "Update Account" : "Link Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
