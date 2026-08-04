"use client";

import type React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserCheck, Sparkles, Code2, Eye, Palette } from "lucide-react";

interface RrMailLinkWizardStep3Props {
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

const COLOR_SWATCHES = [
  "#8B00FF",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#6366F1",
  "#14B8A6",
];

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

  const handleApplyTemplate = (
    type: "minimal" | "professional" | "corporate",
  ) => {
    const nameStr = senderName || "Your Name";
    const orgStr = organization || "Runa Realm";
    const emailStr = emailAddress || "user@domain.com";

    if (type === "minimal") {
      onChangeUseHtmlSig(false);
      onChangeSignature(`Best regards,\n${nameStr}`);
    } else if (type === "professional") {
      onChangeUseHtmlSig(true);
      onChangeSignature(
        `--<br/><b>${nameStr}</b><br/>${orgStr}<br/><span style="color:#888;">${emailStr}</span>`,
      );
    } else if (type === "corporate") {
      onChangeUseHtmlSig(true);
      onChangeSignature(
        `--<br/><b>${nameStr}</b> | <i>${orgStr}</i><br/><br/><span style="font-size:10px; color:#888; font-style:italic;">CONFIDENTIALITY NOTICE: The contents of this email message and any attachments are intended solely for the addressee(s).</span>`,
      );
    }
  };

  return (
    <div className="flex flex-col gap-5 py-2 text-left">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <UserCheck className="size-4 text-primary" />
          {t("mailSettings.wizard.step3Title")}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t("mailSettings.wizard.step3Subtitle")}
        </p>
      </div>

      {/* Identity & Aesthetic Color Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sender-name-input" className="text-xs font-medium">
            {t("mailSettings.senderNameLabel")}
          </Label>
          <Input
            id="sender-name-input"
            value={senderName}
            onChange={(e) => onChangeSenderName(e.target.value)}
            className="h-9 px-3 text-xs bg-background"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="indicator-color-input"
            className="text-xs font-medium flex items-center gap-1"
          >
            <Palette className="size-3 text-primary" />
            {t("mailSettings.indicatorColorLabel")}
          </Label>
          <div className="flex items-center gap-3">
            <div
              className="size-9 rounded-lg border border-border/80 shadow-inner shrink-0 transition-colors"
              style={{ backgroundColor: emailColor }}
            />
            <Input
              id="indicator-color-input"
              type="color"
              value={emailColor}
              onChange={(e) => onChangeEmailColor(e.target.value)}
              className="h-9 w-12 p-0.5 bg-muted border-border rounded-lg cursor-pointer"
            />
            <div className="flex gap-1.5 items-center overflow-x-auto py-1">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChangeEmailColor(c)}
                  className={cn(
                    "size-5 rounded-full border border-black/30 cursor-pointer transition-all hover:scale-110 shrink-0",
                    emailColor === c &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reply-to-input" className="text-xs font-medium">
            {t("mailSettings.replyToLabel")}
          </Label>
          <Input
            id="reply-to-input"
            value={replyTo}
            onChange={(e) => onChangeReplyTo(e.target.value)}
            className="h-9 px-3 text-xs bg-background"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organization-input" className="text-xs font-medium">
            {t("mailSettings.organizationLabel")}
          </Label>
          <Input
            id="organization-input"
            value={organization}
            onChange={(e) => onChangeOrganization(e.target.value)}
            className="h-9 px-3 text-xs bg-background"
          />
        </div>
      </div>

      {/* Signature Editor Section */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="email-sig-textarea"
              className="text-xs font-semibold text-foreground"
            >
              {t("mailSettings.signatureLabel")}
            </Label>
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 border-border text-muted-foreground"
            >
              {useHtmlSig ? "HTML" : "PLAIN TEXT"}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Templates */}
            <div className="flex items-center gap-1">
              <Sparkles className="size-3 text-amber-500" />
              <span className="text-[10px] font-medium text-muted-foreground mr-1">
                {t("mailSettings.wizard.sigTemplatesLabel")}:
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleApplyTemplate("minimal")}
                className="h-6 px-1.5 text-[10px] rounded hover:bg-muted cursor-pointer"
              >
                {t("mailSettings.wizard.sigTemplateMinimal")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleApplyTemplate("professional")}
                className="h-6 px-1.5 text-[10px] rounded hover:bg-muted cursor-pointer"
              >
                {t("mailSettings.wizard.sigTemplatePro")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleApplyTemplate("corporate")}
                className="h-6 px-1.5 text-[10px] rounded hover:bg-muted cursor-pointer"
              >
                {t("mailSettings.wizard.sigTemplateCorp")}
              </Button>
            </div>

            <div className="flex items-center gap-1.5 border-l border-border/40 pl-3">
              <input
                id="use-html-checkbox"
                type="checkbox"
                checked={useHtmlSig}
                onChange={(e) => onChangeUseHtmlSig(e.target.checked)}
                className="size-3.5 bg-background border-border text-primary rounded-xs cursor-pointer"
              />
              <Label
                htmlFor="use-html-checkbox"
                className="text-xs cursor-pointer text-muted-foreground flex items-center gap-1"
              >
                <Code2 className="size-3" />
                {t("mailSettings.useHtmlSigLabel")}
              </Label>
            </div>
          </div>
        </div>

        <textarea
          id="email-sig-textarea"
          value={signature}
          onChange={(e) => onChangeSignature(e.target.value)}
          className="w-full min-h-22.5 p-3 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground font-mono"
        />
      </div>

      {/* Recipient Live Identity Preview Card */}
      <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-border bg-muted/40">
        <div className="flex items-center gap-1.5">
          <Eye className="size-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            {t("mailSettings.wizard.recipientPreviewTitle")}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-border/60 bg-card flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-2">
              <div
                className="size-7 rounded-full flex items-center justify-center font-bold text-white text-[11px] shrink-0"
                style={{ backgroundColor: emailColor }}
              >
                {(senderName || emailAddress || "U")
                  .substring(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">
                    {senderName ||
                      t("mailSettings.wizard.previewNamePlaceholder")}
                  </span>
                  {organization && (
                    <span className="text-[10px] text-muted-foreground/80">
                      ({organization})
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  &lt;{emailAddress || "user@domain.com"}&gt;
                </span>
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-[9px] font-normal border-border"
            >
              {t("mailSettings.wizard.fromRecipientView")}
            </Badge>
          </div>

          <div className="text-xs text-foreground/90 pt-1 overflow-y-auto max-h-22.5">
            {useHtmlSig ? (
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    signature ||
                    `<i>${t("mailSettings.noSignatureContent")}</i>`,
                }}
              />
            ) : (
              <pre className="font-sans whitespace-pre-wrap">
                {signature || t("mailSettings.noSignatureContent")}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
