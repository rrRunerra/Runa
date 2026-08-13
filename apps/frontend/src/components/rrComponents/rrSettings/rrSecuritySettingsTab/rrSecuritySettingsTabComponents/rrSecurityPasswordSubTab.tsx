"use client";

import type React from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { RrChangePasswordCard } from "./rrChangePasswordCard";

export interface RrSecurityPasswordSubTabProps {
  isSubmitting: boolean;
  onChangePassword: (current: string, newPass: string) => Promise<void>;
  isRefreshing: boolean;
  refreshCountdown: number;
  lastRefreshTime: number | null;
  onRefreshToken: () => Promise<void>;
  sessionExpires?: string;
}

/**
 * Presentational view component for Password modification and Session Token refresh.
 */
export function RrSecurityPasswordSubTab({
  isSubmitting,
  onChangePassword,
  isRefreshing,
  refreshCountdown,
  lastRefreshTime,
  onRefreshToken,
  sessionExpires,
}: RrSecurityPasswordSubTabProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
      {/* Password change card */}
      <RrChangePasswordCard
        isSubmitting={isSubmitting}
        onChangePassword={onChangePassword}
      />

      {/* Session Token Refresh Card */}
      <Card className="h-full flex flex-col justify-between relative overflow-hidden text-left">
        <div>
          <CardHeader className="pb-3">
            <CardTitle>
              {t("securitySettings.sessionSettingsTitle", "Session Token Refresh")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t(
                "securitySettings.sessionSettingsDesc",
                "Refresh your active session token or view expiration details."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-xs text-muted-foreground/85 bg-muted/20 border border-border/40 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span>{t("securitySettings.lastRefreshLabel", "Last Token Refresh")}</span>
                <span className="font-mono text-foreground font-semibold">
                  {lastRefreshTime
                    ? new Date(lastRefreshTime).toLocaleString()
                    : t("securitySettings.neverThisSession", "Never this session")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t("securitySettings.tokenExpirationLabel", "Token Expiration")}</span>
                <span className="font-mono text-foreground font-semibold">
                  {sessionExpires
                    ? new Date(sessionExpires).toLocaleString()
                    : t("securitySettings.unknown", "Unknown")}
                </span>
              </div>
            </div>
          </CardContent>
        </div>
        <CardFooter className="pt-4 pb-6 px-6">
          <Button
            onClick={onRefreshToken}
            disabled={isRefreshing || refreshCountdown > 0}
            className="w-full h-9 rounded-xl font-semibold cursor-pointer relative"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {t("securitySettings.refreshing", "Refreshing...")}
              </>
            ) : refreshCountdown > 0 ? (
              t("securitySettings.refreshTokenCountdown", "Wait {{seconds}}s", {
                seconds: refreshCountdown,
              })
            ) : (
              <>
                <RefreshCw className="size-4 mr-2" />
                {t("securitySettings.refreshSessionBtn", "Refresh Session Token")}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
