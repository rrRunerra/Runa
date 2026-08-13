"use client";

import type React from "react";
import { Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { RrDeviceItem } from "./rrDeviceItem";
import { RrConfirmDialog } from "@/components/rrComponents/rrConfirmDialog";
import { useTranslation } from "react-i18next";
import { RR_SETTINGS_LIMITS } from "@/lib/constants";

export interface RrSecurityDevicesSubTabProps {
  devices: any[];
  linkCodeInput: string;
  setLinkCodeInput: (val: string) => void;
  isLinking: boolean;
  onLinkDevice: () => Promise<void>;
  revokeDeviceId: string | null;
  setRevokeDeviceId: (id: string | null) => void;
  isRevoking: boolean;
  onRevokeDevice: (id: string) => Promise<void>;
}

/**
 * Presentational subtab component displaying linked devices and device authorization input.
 */
export function RrSecurityDevicesSubTab({
  devices,
  linkCodeInput,
  setLinkCodeInput,
  isLinking,
  onLinkDevice,
  revokeDeviceId,
  setRevokeDeviceId,
  isRevoking,
  onRevokeDevice,
}: RrSecurityDevicesSubTabProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Link New Device Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="size-4 text-primary" />
            {t("securitySettings.linkNewDeviceTitle", "Link New Device")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t(
              "securitySettings.linkDeviceDesc",
              "Enter the authorization code shown on your new TV or Mobile app to link it to your account.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Input
              type="text"
              placeholder={t(
                "securitySettings.linkCodePlaceholder",
                "Enter 6-digit code (e.g. 123-456)",
              )}
              value={linkCodeInput}
              onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
              maxLength={RR_SETTINGS_LIMITS.LINK_CODE_DISPLAY_LENGTH}
              className="font-mono text-sm tracking-wider uppercase flex-1 h-9 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && linkCodeInput && !isLinking) {
                  e.preventDefault();
                  onLinkDevice();
                }
              }}
            />
            <Button
              onClick={onLinkDevice}
              disabled={isLinking || !linkCodeInput.trim()}
              className="h-9 rounded-xl px-5 font-semibold cursor-pointer shrink-0"
            >
              {isLinking ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  {t("securitySettings.linking", "Linking...")}
                </>
              ) : (
                t("securitySettings.authorizeBtn", "Authorize Device")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connected Devices List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("securitySettings.connectedDevicesTitle", "Authorized Devices")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t(
              "securitySettings.connectedDevicesDesc",
              "Manage devices that currently have active access to your account.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {devices.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              {t(
                "securitySettings.noConnectedDevices",
                "No linked devices found.",
              )}
            </div>
          ) : (
            devices.map((device) => (
              <RrDeviceItem
                key={device.id}
                device={device}
                onRevoke={() => setRevokeDeviceId(device.id)}
                isRevoking={isRevoking && revokeDeviceId === device.id}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Revoke Device Confirmation Dialog */}
      <RrConfirmDialog
        open={!!revokeDeviceId}
        onOpenChange={(open: boolean) => {
          if (!open) setRevokeDeviceId(null);
        }}
        title={t("securitySettings.revokeDeviceConfirmTitle", "Revoke Device")}
        description={t(
          "securitySettings.revokeDeviceConfirm",
          "Are you sure you want to revoke access for this device?",
        )}
        confirmText={t("securitySettings.revoke", "Revoke Access")}
        variant="destructive"
        isSubmitting={isRevoking}
        onConfirm={() => {
          if (revokeDeviceId) onRevokeDevice(revokeDeviceId);
        }}
      />
    </div>
  );
}
