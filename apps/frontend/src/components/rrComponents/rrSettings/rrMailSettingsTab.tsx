"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Plus } from "lucide-react";
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

// Sub-components
import { RrMailAccountCard } from "./rrMailSettingsTabComponents/rrMailAccountCard";

interface RrMailSettingsTabProps {
  onOpenChange: (open: boolean) => void;
}

export function RrMailSettingsTab({ onOpenChange }: RrMailSettingsTabProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();

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

  const { data: emailAccountsData, mutate: refetchEmailAccounts } = useSWR<any[]>(
    session?.accessToken ? [`${process.env.NEXT_PUBLIC_API_URL}/emails`, session.accessToken] : null,
    fetcher
  );

  useEffect(() => {
    if (emailAccountsData) {
      setEmailAccounts(Array.isArray(emailAccountsData) ? emailAccountsData : []);
    }
  }, [emailAccountsData]);

  const apiMutate = async (url: string, method: string = "POST", body?: any) => {
    if (!session?.accessToken) throw new Error("No access token available");
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `Request failed with status ${res.status}`);
    }
    return res.json().catch(() => null);
  };

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
      if (editingEmailAccount) {
        await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/emails/${editingEmailAccount.id}`, "PUT", payload);
      } else {
        await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/emails`, "POST", payload);
      }

      toast.success(editingEmailAccount ? t("mailSettings.toastUpdated") : t("mailSettings.toastAdded"));
      setIsEmailAccountDialogOpen(false);
      fetchEmailAccounts();
      resetEmailForm();
      window.dispatchEvent(new CustomEvent("runa-sidebar-changed"));
    } catch (err: any) {
      toast.error(err.message || t("mailSettings.toastFailedSave"));
    }
  };

  const handleDeleteEmailAccount = async (id: string): Promise<void> => {
    if (!session?.accessToken) return;
    if (!window.confirm(t("mailSettings.deleteConfirm"))) return;
    try {
      await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/emails/${id}`, "DELETE");
      toast.success(t("mailSettings.toastRemoved"));
      fetchEmailAccounts();
      window.dispatchEvent(new CustomEvent("runa-sidebar-changed"));
    } catch (err: any) {
      toast.error(err.message || t("mailSettings.toastFailedDelete"));
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
      toast.error(t("mailSettings.toastEnterEmail"));
      return;
    }
    const domain = autodetectEmail.split("@")[1].toLowerCase().trim();
    if (!domain) return;

    if (!session?.accessToken) {
      toast.error(t("mailSettings.toastAuthRequired"));
      return;
    }

    try {
      const config = await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/emails/autoconfig/${domain}`, "GET");

      setImapHost(config.imapHost || `imap.${domain}`);
      setImapPort(config.imapPort ? String(config.imapPort) : "993");
      setImapSecure(config.imapSecure !== false);
      setSmtpHost(config.smtpHost || `smtp.${domain}`);
      setSmtpPort(config.smtpPort ? String(config.smtpPort) : "465");
      setSmtpSecure(config.smtpSecure !== false);

      toast.success(t("mailSettings.toastAutodetectSuccess", { domain }));
    } catch (err) {
      console.error("Autodetect error:", err);
      toast.error(t("mailSettings.toastAutodetectFailed"));
      
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
      <CardHeader className="flex flex-row items-center justify-between gap-0 pb-4 border-b border-border/40 text-left">
        <div className="flex flex-col gap-0.5">
          <CardTitle>{t("mailSettings.title")}</CardTitle>
          <CardDescription>
            {t("mailSettings.description")}
          </CardDescription>
        </div>
        <Button
          onClick={() => { resetEmailForm(); setIsEmailAccountDialogOpen(true); }}
          className="h-8 rounded-lg cursor-pointer"
        >
          <Plus className="size-3.5 mr-1" />
          {t("mailSettings.linkBtn")}
        </Button>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
        {emailAccounts.map((account) => (
          <RrMailAccountCard
            key={account.id}
            account={account}
            onEdit={() => openEditEmailAccount(account)}
            onDelete={() => handleDeleteEmailAccount(account.id)}
          />
        ))}
        {emailAccounts.length === 0 && (
          <div className="col-span-full p-6 text-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            {t("mailSettings.noAccounts")}
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
          {t("mailSettings.closeSettingsBtn")}
        </Button>
      </CardFooter>

      {/* Thunderbird Email Setup Dialog */}
      <Dialog open={isEmailAccountDialogOpen} onOpenChange={setIsEmailAccountDialogOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl bg-card border border-border shadow-2xl p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-border/40 text-left">
            <DialogTitle className="text-md font-bold">
              {editingEmailAccount ? t("mailSettings.editTitle") : t("mailSettings.linkTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {t("mailSettings.dialogDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col gap-4 text-left">
            {/* Identity & Aesthetics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="account-name">{t("mailSettings.accountNameLabel")}</Label>
                <Input
                  id="account-name"
                  value={emailAccountName}
                  onChange={(e) => setEmailAccountName(e.target.value)}
                  placeholder={t("mailSettings.accountNamePlaceholder")}
                  className="h-9 px-3 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="account-color">{t("mailSettings.indicatorColorLabel")}</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="size-9 rounded-lg border border-border/80 shadow-inner shrink-0 transition-colors"
                    style={{ backgroundColor: emailColor }}
                  />
                  <Input
                    id="account-color"
                    type="color"
                    value={emailColor}
                    onChange={(e) => setEmailColor(e.target.value)}
                    className="h-9 w-14 p-0.5 bg-muted border-border rounded-lg cursor-pointer"
                  />
                  <div className="flex gap-1.5 items-center overflow-x-auto py-1">
                    {["#8B00FF", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#6366F1"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEmailColor(c)}
                        className={cn(
                          "size-5 rounded-full border border-black/40 cursor-pointer transition-all hover:scale-110 shrink-0",
                          emailColor === c && "ring-1 ring-primary ring-offset-1 ring-offset-background"
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Select color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("mailSettings.defaultIdentityTitle")}</h5>
              <p className="text-[10px] text-muted-foreground/60">{t("mailSettings.defaultIdentityDesc")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sender-name">{t("mailSettings.senderNameLabel")}</Label>
                <Input
                  id="sender-name"
                  value={emailSenderName}
                  onChange={(e) => setEmailSenderName(e.target.value)}
                  placeholder={t("mailSettings.senderNamePlaceholder")}
                  className="h-9 px-3 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-address-field">{t("mailSettings.emailAddressLabel")}</Label>
                <Input
                  id="email-address-field"
                  value={emailAddressField}
                  onChange={(e) => setEmailAddressField(e.target.value)}
                  placeholder={t("mailSettings.emailAddressPlaceholder")}
                  className="h-9 px-3 text-xs"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  {t("mailSettings.emailAddressDesc")}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reply-to">{t("mailSettings.replyToLabel")}</Label>
                <Input
                  id="reply-to"
                  value={emailReplyTo}
                  onChange={(e) => setEmailReplyTo(e.target.value)}
                  placeholder={t("mailSettings.replyToPlaceholder")}
                  className="h-9 px-3 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="organization">{t("mailSettings.organizationLabel")}</Label>
                <Input
                  id="organization"
                  value={emailOrganization}
                  onChange={(e) => setEmailOrganization(e.target.value)}
                  placeholder={t("mailSettings.organizationPlaceholder")}
                  className="h-9 px-3 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-signature">{t("mailSettings.signatureLabel")}</Label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="use-html"
                    type="checkbox"
                    checked={emailUseHtmlSig}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailUseHtmlSig(e.target.checked)}
                    className="size-3.5 bg-background border-border text-primary rounded-xs cursor-pointer"
                  />
                  <Label htmlFor="use-html" className="text-[10px] cursor-pointer">{t("mailSettings.useHtmlSigLabel")}</Label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <textarea
                  id="email-signature"
                  value={emailSignature}
                  onChange={(e) => setEmailSignature(e.target.value)}
                  placeholder={t("mailSettings.signaturePlaceholder")}
                  className="w-full min-h-[100px] p-3 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground font-mono"
                />
                <div className="flex flex-col bg-background/50 border border-border rounded-xl p-3 min-h-[100px] text-left">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2 select-none">{t("mailSettings.livePreview")}</span>
                  <div className="text-xs text-foreground/90 overflow-y-auto max-h-[80px]">
                    {emailUseHtmlSig ? (
                      <div dangerouslySetInnerHTML={{ __html: emailSignature || `<i>${t("mailSettings.noSignatureContent")}</i>` }} />
                    ) : (
                      <pre className="font-sans whitespace-pre-wrap">{emailSignature || t("mailSettings.noSignatureContent")}</pre>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-col gap-1">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("mailSettings.serverSettingsTitle")}</h5>
              </div>
              <Button
                type="button"
                onClick={handleAutodetect}
                variant="outline"
                className="h-7 rounded-lg border border-border hover:bg-muted text-[10px] px-2.5 font-semibold shrink-0 cursor-pointer"
              >
                {t("mailSettings.autodetectBtn")}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-email">{t("mailSettings.loginEmailLabel")}</Label>
                <Input
                  id="login-email"
                  value={emailLoginField}
                  onChange={(e) => setEmailLoginField(e.target.value)}
                  placeholder={emailAddressField || t("mailSettings.emailAddressPlaceholder")}
                  className="h-9 px-3 text-xs"
                />
                <p className="text-[10px] text-muted-foreground/60">
                  {t("mailSettings.loginEmailDesc")}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-password">{t("mailSettings.passwordLabel")}</Label>
                <Input
                  id="email-password"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder={t("mailSettings.passwordPlaceholder")}
                  className="h-9 px-3 text-xs"
                />
              </div>
            </div>

            {/* IMAP & SMTP Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-border bg-muted/40">
              {/* Incoming IMAP */}
              <div className="flex flex-col gap-3.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">{t("mailSettings.incomingImapTitle")}</span>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="imap-host">{t("mailSettings.serverHostnameLabel")}</Label>
                  <Input
                    id="imap-host"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.purelymail.com"
                    className="h-8 px-2.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="imap-port">{t("mailSettings.portLabel")}</Label>
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
                      <Label htmlFor="imap-secure" className="text-[10px] cursor-pointer">{t("mailSettings.sslTlsLabel")}</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outgoing SMTP */}
              <div className="flex flex-col gap-3.5">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">{t("mailSettings.outgoingSmtpTitle")}</span>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="smtp-host">{t("mailSettings.serverHostnameLabel")}</Label>
                  <Input
                    id="smtp-host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.purelymail.com"
                    className="h-8 px-2.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="smtp-port">{t("mailSettings.portLabel")}</Label>
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
                      <Label htmlFor="smtp-secure" className="text-[10px] cursor-pointer">{t("mailSettings.sslTlsLabel")}</Label>
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
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSaveEmailAccount}
              disabled={!emailAccountName || (!emailAddressField.trim() && !emailLoginField.trim()) || !emailPassword}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer"
            >
              {editingEmailAccount ? t("mailSettings.updateAccountBtn") : t("mailSettings.linkAccountBtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
