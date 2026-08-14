import type React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

export interface RrMailLinkWizardStep3Props {
  senderName: string;
  onChangeSenderName: (val: string) => void;
  emailAddress: string;
  replyTo: string;
  onChangeReplyTo: (val: string) => void;
  organization: string;
  onChangeOrganization: (val: string) => void;
  emailColor: string;
  onChangeEmailColor: (val: string) => void;
  signature: string;
  onChangeSignature: (val: string) => void;
  useHtmlSig: boolean;
  onChangeUseHtmlSig: (val: boolean) => void;
}

export function RrMailLinkWizardStep3({
  senderName,
  onChangeSenderName,
  emailAddress,
  replyTo,
  onChangeReplyTo,
  organization,
  onChangeOrganization,
  emailColor,
  onChangeEmailColor,
  signature,
  onChangeSignature,
  useHtmlSig,
  onChangeUseHtmlSig,
}: RrMailLinkWizardStep3Props): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 text-left">
      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {t("mailSettings.wizard.identitySignatureHeading")}
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sender-name-input">{t("mailSettings.wizard.senderNameLabel")}</Label>
          <Input
            id="sender-name-input"
            value={senderName}
            onChange={(e) => onChangeSenderName(e.target.value)}
            placeholder={emailAddress ? emailAddress.split("@")[0] : "Your Name"}
            className="h-9 px-3"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reply-to-input">{t("mailSettings.wizard.replyToLabel")}</Label>
          <Input
            id="reply-to-input"
            type="email"
            value={replyTo}
            onChange={(e) => onChangeReplyTo(e.target.value)}
            placeholder="Optional reply-to email"
            className="h-9 px-3"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organization-input">{t("mailSettings.wizard.organizationLabel")}</Label>
          <Input
            id="organization-input"
            value={organization}
            onChange={(e) => onChangeOrganization(e.target.value)}
            placeholder="Optional company or org"
            className="h-9 px-3"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-color-input">{t("mailSettings.wizard.colorBadgeLabel")}</Label>
          <div className="flex items-center gap-2">
            <input
              id="account-color-input"
              type="color"
              value={emailColor}
              onChange={(e) => onChangeEmailColor(e.target.value)}
              className="size-9 rounded-lg border-0 bg-transparent cursor-pointer p-0 shrink-0"
            />
            <Input
              value={emailColor}
              onChange={(e) => onChangeEmailColor(e.target.value)}
              placeholder="#8B00FF"
              className="h-9 px-3 font-mono uppercase text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 pt-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signature-input">{t("mailSettings.wizard.signatureLabel")}</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("mailSettings.wizard.htmlSignatureLabel", "HTML Signature")}
            </span>
            <Switch checked={useHtmlSig} onCheckedChange={onChangeUseHtmlSig} />
          </div>
        </div>
        <Textarea
          id="signature-input"
          value={signature}
          onChange={(e) => onChangeSignature(e.target.value)}
          placeholder="Best regards,..."
          rows={3}
          className="text-xs font-sans resize-none p-3"
        />
      </div>
    </div>
  );
}
