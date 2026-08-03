"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Plus, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { MAIL_PROVIDER_PRESETS, type RrMailProviderPreset } from "./rrMailSettingsTabComponents/rrMailProviderPresets";
import { RrMailLinkWizardStep1 } from "./rrMailSettingsTabComponents/rrMailLinkWizardStep1";
import { RrMailLinkWizardStep2, type ConnectionTestState } from "./rrMailSettingsTabComponents/rrMailLinkWizardStep2";
import { RrMailLinkWizardStep3 } from "./rrMailSettingsTabComponents/rrMailLinkWizardStep3";

interface RrMailSettingsTabProps {
  onOpenChange: (open: boolean) => void;
}

export function RrMailSettingsTab({ onOpenChange }: RrMailSettingsTabProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();

  // Accounts state
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedProvider, setSelectedProvider] = useState<RrMailProviderPreset>(
    MAIL_PROVIDER_PRESETS.find((p) => p.id === "purelymail") || MAIL_PROVIDER_PRESETS[0]
  );

  // Form Fields
  const [accountName, setAccountName] = useState<string>("");
  const [emailColor, setEmailColor] = useState<string>("#8B00FF");
  const [senderName, setSenderName] = useState<string>("");
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [replyTo, setReplyTo] = useState<string>("");
  const [organization, setOrganization] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [useHtmlSig, setUseHtmlSig] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [isAppPassword, setIsAppPassword] = useState<boolean>(false);

  const [imapHost, setImapHost] = useState<string>("imap.purelymail.com");
  const [imapPort, setImapPort] = useState<string>("993");
  const [imapSecure, setImapSecure] = useState<boolean>(true);

  const [smtpHost, setSmtpHost] = useState<string>("smtp.purelymail.com");
  const [smtpPort, setSmtpPort] = useState<string>("465");
  const [smtpSecure, setSmtpSecure] = useState<boolean>(true);

  // Connection Test & Autodetect states
  const [isAutodetecting, setIsAutodetecting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [testState, setTestState] = useState<ConnectionTestState>({
    tested: false,
    loading: false,
  });

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

  const handleSelectProvider = (provider: RrMailProviderPreset) => {
    setSelectedProvider(provider);
    if (provider.imapHost) setImapHost(provider.imapHost);
    setImapPort(String(provider.imapPort));
    setImapSecure(provider.imapSecure);
    if (provider.smtpHost) setSmtpHost(provider.smtpHost);
    setSmtpPort(String(provider.smtpPort));
    setSmtpSecure(provider.smtpSecure);
    if (provider.color) {
      setEmailColor(provider.color);
    }
    setTestState({ tested: false, loading: false });
  };

  const resetForm = () => {
    setEditingAccount(null);
    setCurrentStep(1);
    const customPreset = MAIL_PROVIDER_PRESETS.find((p) => p.id === "custom") || MAIL_PROVIDER_PRESETS[0];
    setSelectedProvider(customPreset);
    setAccountName("");
    setEmailColor("#8B00FF");
    setSenderName("");
    setEmailAddress("");
    setLoginEmail("");
    setReplyTo("");
    setOrganization("");
    setSignature("");
    setUseHtmlSig(false);
    setPassword("");
    setImapHost("");
    setImapPort("");
    setImapSecure(true);
    setSmtpHost("");
    setSmtpPort("");
    setSmtpSecure(true);
    setTestState({ tested: false, loading: false });
  };

  const handleAutodetect = async (): Promise<void> => {
    const autodetectEmail = loginEmail || emailAddress;
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

    setIsAutodetecting(true);
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
      setImapHost(`imap.${domain}`);
      setImapPort("993");
      setImapSecure(true);
      setSmtpHost(`smtp.${domain}`);
      setSmtpPort("465");
      setSmtpSecure(true);
      toast.info(t("mailSettings.toastAutodetectFallback", { domain }));
    } finally {
      setIsAutodetecting(false);
      setTestState({ tested: false, loading: false });
    }
  };

  const handleTestConnection = async (): Promise<boolean> => {
    if (!session?.accessToken) {
      toast.error(t("mailSettings.toastAuthRequired"));
      return false;
    }

    setTestState({ tested: false, loading: true });
    const payload = {
      emailAddress: emailAddress.trim(),
      loginEmail: loginEmail.trim() || emailAddress.trim(),
      password,
      imapHost,
      imapPort: parseInt(imapPort, 10) || 993,
      imapSecure,
      smtpHost,
      smtpPort: parseInt(smtpPort, 10) || 465,
      smtpSecure,
    };

    try {
      const res = await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/emails/test-connection`, "POST", payload);
      const isImapOk = res?.imap?.success;
      const isSmtpOk = res?.smtp?.success;

      setTestState({
        tested: true,
        loading: false,
        imapSuccess: isImapOk,
        imapError: res?.imap?.error,
        smtpSuccess: isSmtpOk,
        smtpError: res?.smtp?.error,
      });

      if (isImapOk && isSmtpOk) {
        toast.success(t("mailSettings.wizard.testConnectionSuccessAll"));
        return true;
      } else {
        toast.error(t("mailSettings.wizard.testConnectionFailedSome"));
        return false;
      }
    } catch (err: any) {
      setTestState({
        tested: true,
        loading: false,
        imapSuccess: false,
        imapError: err.message || "Connection test failed",
        smtpSuccess: false,
        smtpError: err.message || "Connection test failed",
      });
      toast.error(err.message || t("mailSettings.wizard.testConnectionFailed"));
      return false;
    }
  };

  const handleNextStep = async (): Promise<void> => {
    if (currentStep === 1) {
      if (!accountName.trim()) {
        toast.error(t("mailSettings.wizard.enterAccountNameError"));
        return;
      }
      if (!emailAddress.trim()) {
        toast.error(t("mailSettings.wizard.enterEmailAddressError"));
        return;
      }
      if (!loginEmail.trim()) {
        setLoginEmail(emailAddress.trim());
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!password) {
        toast.error(t("mailSettings.wizard.enterPasswordError"));
        return;
      }
      if (!imapHost || !smtpHost) {
        toast.error(t("mailSettings.wizard.enterHostsError"));
        return;
      }

      // Auto connection test on proceeding if not already successfully tested
      if (!testState.tested || !testState.imapSuccess || !testState.smtpSuccess) {
        toast.loading(t("mailSettings.wizard.verifyingCredentialsToast"));
        const success = await handleTestConnection();
        toast.dismiss();
        if (!success) {
          toast.info(t("mailSettings.wizard.proceedAnywayTip"));
        }
      }
      setCurrentStep(3);
    }
  };

  const handleSaveEmailAccount = async (): Promise<void> => {
    if (!session?.accessToken) return;

    const finalEmailAddress = emailAddress.trim() || loginEmail.trim();

    const payload = {
      accountName: accountName.trim(),
      color: emailColor,
      senderName: senderName.trim() || accountName.trim(),
      emailAddress: finalEmailAddress,
      loginEmail: loginEmail.trim() || null,
      replyToAddress: replyTo.trim() || null,
      organization: organization.trim() || null,
      signatureText: signature || null,
      useHtmlSignature: useHtmlSig,
      password: password,
      imapHost: imapHost.trim(),
      imapPort: parseInt(imapPort, 10) || 993,
      imapSecure,
      smtpHost: smtpHost.trim(),
      smtpPort: parseInt(smtpPort, 10) || 465,
      smtpSecure,
    };

    setIsSaving(true);
    try {
      if (editingAccount) {
        await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/emails/${editingAccount.id}`, "PUT", payload);
      } else {
        await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/emails`, "POST", payload);
      }

      toast.success(editingAccount ? t("mailSettings.toastUpdated") : t("mailSettings.toastAdded"));
      setIsDialogOpen(false);
      refetchEmailAccounts();
      resetForm();
      window.dispatchEvent(new CustomEvent("runa-sidebar-changed"));
    } catch (err: any) {
      toast.error(err.message || t("mailSettings.toastFailedSave"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmailAccount = async (id: string): Promise<void> => {
    if (!session?.accessToken) return;
    if (!window.confirm(t("mailSettings.deleteConfirm"))) return;
    try {
      await apiMutate(`${process.env.NEXT_PUBLIC_API_URL}/emails/${id}`, "DELETE");
      toast.success(t("mailSettings.toastRemoved"));
      refetchEmailAccounts();
      window.dispatchEvent(new CustomEvent("runa-sidebar-changed"));
    } catch (err: any) {
      toast.error(err.message || t("mailSettings.toastFailedDelete"));
    }
  };

  const openEditEmailAccount = (account: any): void => {
    setEditingAccount(account);
    setCurrentStep(1);
    setAccountName(account.accountName || "");
    setEmailColor(account.color || "#8B00FF");
    setSenderName(account.senderName || "");
    setEmailAddress(account.emailAddress || "");
    setLoginEmail(account.loginEmail || "");
    setReplyTo(account.replyToAddress || "");
    setOrganization(account.organization || "");
    setSignature(account.signatureText || "");
    setUseHtmlSig(Boolean(account.useHtmlSignature));
    setImapHost(account.imapHost || "");
    setImapPort(account.imapPort ? String(account.imapPort) : "");
    setImapSecure(account.imapSecure !== false);
    setSmtpHost(account.smtpHost || "");
    setSmtpPort(account.smtpPort ? String(account.smtpPort) : "");
    setSmtpSecure(account.smtpSecure !== false);
    setTestState({ tested: false, loading: false });
    setIsDialogOpen(true);
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
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
          className="h-8 rounded-lg cursor-pointer font-semibold text-xs gap-1"
        >
          <Plus className="size-3.5" />
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
          <div className="col-span-full p-8 text-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            {t("mailSettings.noAccounts")}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end pt-4 border-t border-border mt-6">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="text-xs sm:text-sm h-9 px-5 rounded-xl cursor-pointer"
        >
          {t("mailSettings.closeSettingsBtn")}
        </Button>
      </CardFooter>

      {/* Modern 3-Step Setup Wizard Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl bg-card border border-border shadow-2xl p-6 rounded-2xl max-h-[92vh] flex flex-col justify-between overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-border/40 text-left pr-8">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold">
                {editingAccount ? t("mailSettings.editTitle") : t("mailSettings.linkTitle")}
              </DialogTitle>
              <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <span className="font-semibold text-primary">Step {currentStep}</span>
                <span>/</span>
                <span>3</span>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {t("mailSettings.dialogDesc")}
            </DialogDescription>

            {/* Step Progress Indicators */}
            <div className="grid grid-cols-3 gap-2 pt-3">
              {[
                { step: 1, label: t("mailSettings.wizard.step1Header") },
                { step: 2, label: t("mailSettings.wizard.step2Header") },
                { step: 3, label: t("mailSettings.wizard.step3Header") },
              ].map((s) => {
                const isActive = currentStep === s.step;
                const isDone = currentStep > s.step;
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => {
                      if (isDone || (s.step < currentStep)) {
                        setCurrentStep(s.step as 1 | 2 | 3);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer",
                      isActive
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                        : isDone
                        ? "border-border bg-muted/40 text-foreground"
                        : "border-border/40 bg-card text-muted-foreground/60 opacity-70"
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isDone
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check className="size-3" /> : s.step}
                    </div>
                    <span className="text-[11px] truncate hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </DialogHeader>

          {/* Wizard Step Content */}
          <div className="py-2">
            {currentStep === 1 && (
              <RrMailLinkWizardStep1
                selectedProvider={selectedProvider}
                onSelectProvider={handleSelectProvider}
                accountName={accountName}
                onChangeAccountName={setAccountName}
                emailAddress={emailAddress}
                onChangeEmailAddress={setEmailAddress}
              />
            )}

            {currentStep === 2 && (
              <RrMailLinkWizardStep2
                selectedProvider={selectedProvider}
                emailAddress={emailAddress}
                loginEmail={loginEmail}
                onChangeLoginEmail={setLoginEmail}
                password={password}
                onChangePassword={setPassword}
                imapHost={imapHost}
                onChangeImapHost={setImapHost}
                imapPort={imapPort}
                onChangeImapPort={setImapPort}
                imapSecure={imapSecure}
                onChangeImapSecure={setImapSecure}
                smtpHost={smtpHost}
                onChangeSmtpHost={setSmtpHost}
                smtpPort={smtpPort}
                onChangeSmtpPort={setSmtpPort}
                smtpSecure={smtpSecure}
                onChangeSmtpSecure={setSmtpSecure}
                onAutodetect={handleAutodetect}
                isAutodetecting={isAutodetecting}
                testState={testState}
                onTestConnection={handleTestConnection}
              />
            )}

            {currentStep === 3 && (
              <RrMailLinkWizardStep3
                senderName={senderName}
                onChangeSenderName={setSenderName}
                emailAddress={emailAddress}
                replyTo={replyTo}
                onChangeReplyTo={setReplyTo}
                organization={organization}
                onChangeOrganization={setOrganization}
                emailColor={emailColor}
                onChangeEmailColor={setEmailColor}
                signature={signature}
                onChangeSignature={setSignature}
                useHtmlSig={useHtmlSig}
                onChangeUseHtmlSig={setUseHtmlSig}
              />
            )}
          </div>

          {/* Dialog Navigation Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep((currentStep - 1) as 1 | 2);
                } else {
                  setIsDialogOpen(false);
                }
              }}
              className="text-xs h-9 px-4 rounded-xl cursor-pointer gap-1"
            >
              {currentStep > 1 ? (
                <>
                  <ArrowLeft className="size-3.5" />
                  {t("back")}
                </>
              ) : (
                t("cancel")
              )}
            </Button>

            <div className="flex items-center gap-2">
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-5 text-xs h-9 cursor-pointer gap-1.5"
                >
                  {t("next")}
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSaveEmailAccount}
                  disabled={isSaving || !accountName || (!emailAddress.trim() && !loginEmail.trim()) || !password}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-xl px-6 text-xs h-9 cursor-pointer gap-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  {editingAccount ? t("mailSettings.updateAccountBtn") : t("mailSettings.linkAccountBtn")}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
