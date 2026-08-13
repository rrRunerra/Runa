"use client";

import type React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export interface RrAccountInfoSubTabProps {
  displayName: string;
  setDisplayName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  emailError: string;
  setEmailError: (val: string) => void;
}

/**
 * Information subtab component for editing display name and email address.
 */
export function RrAccountInfoSubTab({
  displayName,
  setDisplayName,
  email,
  setEmail,
  emailError,
  setEmailError,
}: RrAccountInfoSubTabProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="p-1 w-full text-left">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>
            {t("account.profileInformation", "Profile Information")}
          </CardTitle>
          <CardDescription>
            {t("account.publicDetails", "Update your public display name and contact email.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="display-name">
              {t("account.displayName", "Display Name")}
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("account.enterDisplayName", "Enter display name")}
              className="h-9 px-3"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <Label htmlFor="email">
              {emailError ? (
                <span className="text-destructive">{emailError}</span>
              ) : (
                t("account.emailAddress", "Email Address")
              )}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              placeholder={t("account.enterEmailAddress", "name@example.com")}
              className={cn(
                "h-9 px-3",
                emailError &&
                  "border-destructive/55 bg-destructive/5 focus-visible:ring-destructive/30"
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
