import type React from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { MAIL_PROVIDER_PRESETS, type RrMailProviderPreset } from "./rrMailProviderPresets";
import { cn } from "@/lib/utils";

export interface RrMailLinkWizardStep1Props {
  selectedProvider: RrMailProviderPreset;
  onSelectProvider: (provider: RrMailProviderPreset) => void;
  accountName: string;
  onChangeAccountName: (val: string) => void;
  emailAddress: string;
  onChangeEmailAddress: (val: string) => void;
}

export function RrMailLinkWizardStep1({
  selectedProvider,
  onSelectProvider,
  accountName,
  onChangeAccountName,
  emailAddress,
  onChangeEmailAddress,
}: RrMailLinkWizardStep1Props): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5 text-left">
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("mailSettings.wizard.selectProviderLabel")}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {MAIL_PROVIDER_PRESETS.map((p) => {
            const isSelected = selectedProvider.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProvider(p)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer relative",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border/60 bg-muted/20 hover:bg-muted/30"
                )}
              >
                <div
                  className="size-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-xs font-semibold text-foreground truncate flex-1">
                  {p.name}
                </span>
                {isSelected && (
                  <Check className="size-3.5 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-name-input">{t("mailSettings.wizard.accountNameLabel")}</Label>
          <Input
            id="account-name-input"
            value={accountName}
            onChange={(e) => onChangeAccountName(e.target.value)}
            placeholder="e.g. Work Mail, Purelymail"
            className="h-9 px-3"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email-address-input">{t("mailSettings.wizard.emailAddressLabel")}</Label>
          <Input
            id="email-address-input"
            type="email"
            value={emailAddress}
            onChange={(e) => onChangeEmailAddress(e.target.value)}
            placeholder="you@domain.com"
            className="h-9 px-3"
          />
        </div>
      </div>
    </div>
  );
}
