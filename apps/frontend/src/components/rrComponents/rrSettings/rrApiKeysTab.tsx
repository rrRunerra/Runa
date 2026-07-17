"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  KeyRound,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";

import { rrApps } from "../../../../config/rrApps";

interface ApiKeyEntry {
  id: string;
  name: string;
  app: string;
  truncatedKey: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

interface RevealedKey {
  id: string;
  name: string;
  key: string;
  app?: string;
  isRegenerate?: boolean;
}

interface RrApiKeysTabProps {
  onOpenChange: (open: boolean) => void;
}

export const RrApiKeysTab = ({
  onOpenChange: _onOpenChange,
}: RrApiKeysTabProps): React.JSX.Element => {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const [newKeyName, setNewKeyName] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRegenerateId, setConfirmRegenerateId] = useState<string | null>(
    null,
  );
  const [revealedKey, setRevealedKey] = useState<RevealedKey | null>(null);
  const [keyCopied, setKeyCopied] = useState<boolean>(false);
  const [keyVisible, setKeyVisible] = useState<boolean>(false);

  // Expiration settings modal states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [expiresOption, setExpiresOption] = useState<string>("never");
  const [customExpiresDays, setCustomExpiresDays] = useState<string>("30");
  const [appOption, setAppOption] = useState<string>("Polaris");

  const {
    data: keys,
    isLoading: loading,
    mutate: refetch,
  } = useSWR<ApiKeyEntry[]>(
    session?.accessToken
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/users/me/api-keys`,
          session.accessToken,
        ]
      : null,
    fetcher,
  );

  const handleCreate = useCallback(async (): Promise<void> => {
    if (!newKeyName.trim() || !session?.accessToken || isCreating) return;

    setIsCreating(true);

    let expiresInDays: number | null = null;
    if (expiresOption !== "never") {
      if (expiresOption === "custom") {
        const parsed = parseInt(customExpiresDays, 10);
        if (isNaN(parsed) || parsed <= 0) {
          toast.error("Please enter a valid number of days.");
          setIsCreating(false);
          return;
        }
        expiresInDays = parsed;
      } else {
        const map: Record<string, number> = {
          "1d": 1,
          "7d": 7,
          "30d": 30,
          "90d": 90,
          "180d": 180,
          "365d": 365,
        };
        expiresInDays = map[expiresOption] || null;
      }
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/me/api-keys`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            name: newKeyName.trim(),
            expiresInDays,
            app: appOption,
          }),
        },
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || t("apiKeys.toastFailedCreate"));
      }
      const created = (await res.json()) as RevealedKey;

      setNewKeyName("");
      setExpiresOption("never");
      setCustomExpiresDays("30");
      setAppOption("Polaris");
      setIsCreateDialogOpen(false);
      setRevealedKey({
        id: created.id,
        name: created.name,
        key: created.key,
        app: created.app,
      });
      setKeyVisible(false);
      setKeyCopied(false);
      refetch();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : t("apiKeys.toastFailedCreate"),
      );
    } finally {
      setIsCreating(false);
    }
  }, [
    newKeyName,
    session,
    isCreating,
    expiresOption,
    customExpiresDays,
    appOption,
    refetch,
    t,
  ]);

  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      if (!session?.accessToken) return;
      setDeletingId(id);
      setConfirmDeleteId(null);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/me/api-keys/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          },
        );
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.message || t("apiKeys.toastFailedDelete"));
        }

        toast.success(t("apiKeys.toastDeleted"));
        refetch();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : t("apiKeys.toastFailedDelete"),
        );
      } finally {
        setDeletingId(null);
      }
    },
    [session, refetch, t],
  );

  const handleRegenerate = useCallback(
    async (id: string, name: string): Promise<void> => {
      if (!session?.accessToken) return;
      setRegeneratingId(id);
      setConfirmRegenerateId(null);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/me/api-keys/${id}/regenerate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          },
        );
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.message || t("apiKeys.toastFailedRegenerate"));
        }
        const regenerated = (await res.json()) as RevealedKey;

        setRevealedKey({
          id: regenerated.id,
          name,
          key: regenerated.key,
          app: regenerated.app,
          isRegenerate: true,
        });
        setKeyVisible(false);
        setKeyCopied(false);
        refetch();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : t("apiKeys.toastFailedRegenerate"),
        );
      } finally {
        setRegeneratingId(null);
      }
    },
    [session, refetch, t],
  );

  const handleCopyKey = useCallback(async (): Promise<void> => {
    if (!revealedKey?.key) return;
    await navigator.clipboard.writeText(revealedKey.key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2500);
  }, [revealedKey]);

  const formatLastUsed = (lastUsedAt: string | null): string => {
    if (!lastUsedAt) return t("apiKeys.never");
    return formatDistanceToNow(new Date(lastUsedAt), { addSuffix: true });
  };

  const confirmDeleteKey = keys?.find((k) => k.id === confirmDeleteId);
  const confirmRegenerateKey = keys?.find((k) => k.id === confirmRegenerateId);

  return (
    <>
      <div className="flex flex-col p-2 text-left">
        {/* Merged API Keys Card */}
        <Card className="flex flex-col h-[530px]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 shrink-0">
            <div className="flex flex-col gap-1 min-w-0">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                {t("apiKeys.title")}
              </CardTitle>
              <CardDescription className="truncate max-w-[280px] xs:max-w-[400px] sm:max-w-none">
                {t("apiKeys.description")}
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setNewKeyName("");
                setExpiresOption("never");
                setCustomExpiresDays("30");
                setIsCreateDialogOpen(true);
              }}
              size="sm"
              className="cursor-pointer shrink-0"
            >
              <Plus data-icon="inline-start" />
              {t("apiKeys.createBtn")}
            </Button>
          </CardHeader>

          <Separator className="shrink-0" />

          <CardContent className="p-0 flex-1 overflow-y-auto min-h-0 scrollbar-thin flex flex-col">
            {loading ? (
              <div className="flex flex-col gap-3 p-6 shrink-0">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : !keys?.length ? (
              <div className="grow flex items-center justify-center p-6 h-full">
                <Empty className="my-auto">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <KeyRound />
                    </EmptyMedia>
                    <EmptyTitle>{t("apiKeys.noKeys")}</EmptyTitle>
                    <EmptyDescription>
                      {t("apiKeys.noKeysDesc")}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="divide-y divide-border/40 pb-2 grow">
                {keys.map((apiKey) => {
                  const isDeleting = deletingId === apiKey.id;
                  const isRegenerating = regeneratingId === apiKey.id;
                  const isBusy = isDeleting || isRegenerating;
                  const isExpired =
                    apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date();

                  return (
                    <div
                      key={apiKey.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 group"
                    >
                      {/* Key info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <KeyRound className="size-3.5 text-primary" />
                        </div>

                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {apiKey.name}
                            </p>
                            <Badge
                              variant="outline"
                              className="font-semibold text-[9px] h-4 bg-muted text-muted-foreground border-border cursor-default shrink-0 px-1.5 uppercase"
                            >
                              {apiKey.app}
                            </Badge>
                            {isExpired && (
                              <Badge
                                variant="destructive"
                                className="font-semibold text-[9px] h-4 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10 cursor-default shrink-0 px-1.5"
                              >
                                {t("apiKeys.expiredBadge")}
                              </Badge>
                            )}
                          </div>

                          <Badge
                            variant="secondary"
                            className="w-fit font-mono text-[11px]"
                          >
                            {apiKey.truncatedKey}
                          </Badge>

                          <div className="flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="size-2.5" />
                              {t("apiKeys.createdLabel")}{" "}
                              {formatDistanceToNow(new Date(apiKey.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                            {apiKey.expiresAt && (
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-[10px]",
                                  isExpired
                                    ? "text-destructive font-semibold"
                                    : "text-muted-foreground",
                                )}
                              >
                                <Clock className="size-2.5" />
                                {isExpired
                                  ? `${t("apiKeys.expired")} ${formatDistanceToNow(new Date(apiKey.expiresAt), { addSuffix: true })}`
                                  : `${t("apiKeys.expires")} ${formatDistanceToNow(new Date(apiKey.expiresAt), { addSuffix: true })}`}
                              </span>
                            )}
                            <span
                              className={cn(
                                "flex items-center gap-1 text-[10px]",
                                apiKey.lastUsedAt
                                  ? "text-success font-semibold"
                                  : "text-muted-foreground",
                              )}
                            >
                              <Clock className="size-2.5" />
                              {t("apiKeys.lastUsed")}{" "}
                              {formatLastUsed(apiKey.lastUsedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {!isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => setConfirmRegenerateId(apiKey.id)}
                            className="cursor-pointer"
                          >
                            {isRegenerating ? (
                              <Spinner />
                            ) : (
                              <>
                                <RefreshCw data-icon="inline-start" />
                                {t("apiKeys.regenerateBtn")}
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(apiKey.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer"
                        >
                          {isDeleting ? (
                            <Spinner />
                          ) : (
                            <>
                              <Trash2 data-icon="inline-start" />
                              {t("apiKeys.deleteBtn")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Create API Key Dialog ── */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setNewKeyName("");
            setExpiresOption("never");
            setCustomExpiresDays("30");
            setAppOption("Polaris");
          }
        }}
      >
        <DialogContent className="max-w-md text-left">
          <DialogHeader>
            <DialogTitle>{t("apiKeys.createTitle")}</DialogTitle>
            <DialogDescription>
              {t("apiKeys.createDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <Field>
              <FieldLabel htmlFor="new-api-key-name">{t("apiKeys.keyNameLabel")}</FieldLabel>
              <Input
                id="new-api-key-name"
                placeholder={t("apiKeys.keyNamePlaceholder")}
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                maxLength={64}
                disabled={isCreating}
                className="h-9 text-sm"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="api-key-app">{t("apiKeys.associatedApp")}</FieldLabel>
              <NativeSelect
                id="api-key-app"
                value={appOption}
                onChange={(e) => setAppOption(e.target.value)}
                disabled={isCreating}
                className="w-full"
              >
                {rrApps.map((app) => (
                  <NativeSelectOption key={app.name} value={app.name}>
                    {app.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor="api-key-expiration">{t("apiKeys.expiration")}</FieldLabel>
              <div className="flex flex-col gap-2">
                <NativeSelect
                  id="api-key-expiration"
                  value={expiresOption}
                  onChange={(e) => setExpiresOption(e.target.value)}
                  disabled={isCreating}
                  className="w-full"
                >
                  <NativeSelectOption value="never">
                    {t("apiKeys.expNever")}
                  </NativeSelectOption>
                  <NativeSelectOption value="1d">{t("apiKeys.exp1Day")}</NativeSelectOption>
                  <NativeSelectOption value="7d">
                    {t("apiKeys.exp7Days")}
                  </NativeSelectOption>
                  <NativeSelectOption value="30d">
                    {t("apiKeys.exp30Days")}
                  </NativeSelectOption>
                  <NativeSelectOption value="90d">{t("apiKeys.exp90Days")}</NativeSelectOption>
                  <NativeSelectOption value="180d">{t("apiKeys.exp180Days")}</NativeSelectOption>
                  <NativeSelectOption value="365d">
                    {t("apiKeys.exp365Days")}
                  </NativeSelectOption>
                  <NativeSelectOption value="custom">
                    {t("apiKeys.expCustom")}
                  </NativeSelectOption>
                </NativeSelect>

                {expiresOption === "custom" && (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min={1}
                      placeholder={t("apiKeys.customDaysPlaceholder")}
                      value={customExpiresDays}
                      onChange={(e) => setCustomExpiresDays(e.target.value)}
                      disabled={isCreating}
                      className="h-9 text-sm w-32"
                    />
                    <span className="text-xs text-muted-foreground">{t("apiKeys.daysUnit")}</span>
                  </div>
                )}
              </div>
            </Field>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
              className="cursor-pointer"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newKeyName.trim() || isCreating}
              className="cursor-pointer"
            >
              {isCreating ? <Spinner /> : t("apiKeys.generateBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── One-time Key Reveal Dialog ── */}
      <Dialog
        open={!!revealedKey}
        onOpenChange={(open) => {
          if (!open) {
            setRevealedKey(null);
            setKeyCopied(false);
            setKeyVisible(false);
          }
        }}
      >
        <DialogContent className="max-w-lg text-left">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              {revealedKey?.isRegenerate
                ? t("apiKeys.keyRegenerated")
                : t("apiKeys.keyCreated")}{" — "}{revealedKey?.name} ({revealedKey?.app})
            </DialogTitle>
            <DialogDescription>
              {t("apiKeys.revealDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Warning */}
            <Alert>
              <AlertTriangle />
              <AlertDescription>
                {t("apiKeys.revealWarning")}
              </AlertDescription>
            </Alert>

            {/* Key field */}
            <Field>
              <FieldLabel>{t("apiKeys.revealLabel")}</FieldLabel>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    type={keyVisible ? "text" : "password"}
                    value={revealedKey?.key ?? ""}
                    className="font-mono text-xs pr-9"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={() => setKeyVisible((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={keyVisible ? t("apiKeys.hideKey") : t("apiKeys.showKey")}
                  >
                    {keyVisible ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                </div>
                <Button
                  type="button"
                  onClick={handleCopyKey}
                  variant={keyCopied ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 cursor-pointer"
                >
                  {keyCopied ? (
                    <>
                      <Check data-icon="inline-start" />
                      {t("apiKeys.copied")}
                    </>
                  ) : (
                    <>
                      <Copy data-icon="inline-start" />
                      {t("apiKeys.copy")}
                    </>
                  )}
                </Button>
              </div>
            </Field>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRevealedKey(null);
                setKeyCopied(false);
                setKeyVisible(false);
              }}
              className="cursor-pointer"
            >
              {t("apiKeys.savedCloseBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent className="">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("apiKeys.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-wrap w-full">
              {t("apiKeys.deleteConfirmDesc1")}{" "}
              <strong className="text-primary">
                &ldquo;{confirmDeleteKey?.name}&rdquo;
              </strong>
              {t("apiKeys.deleteConfirmDesc2")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="w-full">
            <AlertDialogCancel className="cursor-pointer">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {t("apiKeys.deleteConfirmBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Regenerate Confirmation ── */}
      <AlertDialog
        open={!!confirmRegenerateId}
        onOpenChange={(open) => !open && setConfirmRegenerateId(null)}
      >
        <AlertDialogContent className="text-left">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("apiKeys.regenerateTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-wrap w-full">
              {t("apiKeys.regenerateConfirmDesc1")}{" "}
              <strong className="text-primary">
                &ldquo;{confirmRegenerateKey?.name}&rdquo;
              </strong>{" "}
              {t("apiKeys.regenerateConfirmDesc2")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="w-full">
            <AlertDialogCancel className="cursor-pointer">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmRegenerateId &&
                handleRegenerate(
                  confirmRegenerateId,
                  confirmRegenerateKey?.name ?? "",
                )
              }
              className="cursor-pointer"
            >
              {t("apiKeys.regenerateConfirmBtn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
