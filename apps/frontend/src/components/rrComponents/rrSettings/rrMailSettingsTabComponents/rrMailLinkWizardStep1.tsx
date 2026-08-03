"use client";

import type React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MAIL_PROVIDER_PRESETS,
  type RrMailProviderPreset,
} from "./rrMailProviderPresets";
import { Mail, Check } from "lucide-react";

interface RrMailLinkWizardStep1Props {
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
    <div className="flex flex-col gap-5 py-2 text-left">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Mail className="size-4 text-primary" />
          {t("mailSettings.wizard.step1Title")}
        </h4>
        <p className="text-xs text-muted-foreground">
          {t("mailSettings.wizard.step1Subtitle")}
        </p>
      </div>

      {/* Provider Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {MAIL_PROVIDER_PRESETS.map((provider) => {
          const isSelected = selectedProvider.id === provider.id;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onSelectProvider(provider)}
              className={cn(
                "relative flex flex-col justify-between p-3 rounded-xl border transition-all text-left cursor-pointer min-h-21.5",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                  : "border-border/60 bg-card hover:bg-muted/60 hover:border-border",
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: provider.color }}
                />
                {isSelected ? (
                  <Badge
                    variant="default"
                    className="size-4 p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="size-2.5" />
                  </Badge>
                ) : (
                  provider.badgeText && (
                    <span className="text-[9px] font-mono text-muted-foreground/70 uppercase tracking-tight truncate max-w-20">
                      {provider.badgeText}
                    </span>
                  )
                )}
              </div>

              <div className="flex flex-col gap-0.5 mt-2">
                <span className="text-xs font-semibold text-foreground truncate">
                  {provider.name}
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {provider.imapHost
                    ? provider.imapHost
                    : t("mailSettings.providers.customDesc")}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Basic Account Info Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-name-input" className="text-xs font-medium">
            {t("mailSettings.accountNameLabel")}
          </Label>
          <Input
            id="account-name-input"
            value={accountName}
            onChange={(e) => onChangeAccountName(e.target.value)}
            className="h-9 px-3 text-xs bg-background"
          />
          <p className="text-[10px] text-muted-foreground">
            {t(
              "mailSettings.wizard.accountNameDesc",
              t("mailSettings.accountNameDesc"),
            )}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email-address-input" className="text-xs font-medium">
            {t("mailSettings.emailAddressLabel")}
          </Label>
          <Input
            id="email-address-input"
            type="email"
            value={emailAddress}
            onChange={(e) => onChangeEmailAddress(e.target.value)}
            className="h-9 px-3 text-xs bg-background"
          />
          <p className="text-[10px] text-muted-foreground">
            {t("mailSettings.emailAddressDesc")}
          </p>
        </div>
      </div>
    </div>
  );
}
