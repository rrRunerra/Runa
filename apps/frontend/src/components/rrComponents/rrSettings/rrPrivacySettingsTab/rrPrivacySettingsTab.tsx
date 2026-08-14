"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { RrPillNav, type RrPillNavItem } from "@/components/rrComponents/rrPillNav";

// Sub-components & Types
import {
  type PrivacyLevel,
  type PrivacyAppId,
  RrAquilaPrivacySubTab,
  RrPolarisPrivacySubTab,
  RrLynxPrivacySubTab,
} from "./rrPrivacySettingsTabComponents";

export interface RrPrivacySettingsTabProps {
  /** Callback to close the parent settings modal */
  onOpenChange: (open: boolean) => void;
  /** Callback to register custom action buttons in the parent modal footer */
  setFooterContent?: (content: React.ReactNode | null) => void;
}

/**
 * Normalizes boolean or string values from backend to PrivacyLevel.
 */
function normalizePrivacyLevel(val: unknown): PrivacyLevel {
  if (val === "private" || val === "only_me" || val === true) return "private";
  if (val === "friends") return "friends";
  return "public";
}

/**
 * Main Privacy Settings Tab Component.
 * Orchestrates sub-tabs by application (Aquila, Polaris, Lynx) with 3 privacy visibility tiers.
 */
export function RrPrivacySettingsTab({
  onOpenChange,
  setFooterContent,
}: RrPrivacySettingsTabProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();

  // Active sub-tab state
  const [activeApp, setActiveApp] = useState<PrivacyAppId>("aquila");

  // Privacy dictionary state
  const [privacyState, setPrivacyState] = useState<Record<string, PrivacyLevel>>({
    profile: "public",
    friends: "public",
    animeList: "public",
    mangaList: "public",
    movieList: "public",
    tvList: "public",
    gameList: "public",
    bookList: "public",
    connections: "public",
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch current user privacy settings
  const {
    data: privacyData,
    isLoading: privacyLoading,
    mutate: refetchPrivacy,
  } = useSWR<Record<string, unknown>>(
    session?.accessToken
      ? [`${process.env.NEXT_PUBLIC_API_URL}/users/me/privacy`, session.accessToken]
      : null,
    fetcher,
  );

  // Sync state from server response
  useEffect(() => {
    if (privacyData && typeof privacyData === "object") {
      const nextState: Record<string, PrivacyLevel> = {};
      for (const [key, value] of Object.entries(privacyData)) {
        nextState[key] = normalizePrivacyLevel(value);
      }
      setPrivacyState((prev) => ({
        ...prev,
        ...nextState,
      }));
    }
  }, [privacyData]);

  // Handle individual setting toggle
  const handleLevelChange = useCallback((id: string, level: PrivacyLevel): void => {
    setPrivacyState((prev) => ({
      ...prev,
      [id]: level,
    }));
  }, []);

  // Save changes to backend
  const handleSaveSettings = useCallback(async (): Promise<void> => {
    if (!session?.accessToken) {
      toast.error(t("privacy.mustBeLoggedIn"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...privacyState,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/privacy`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || t("privacy.failedSaveSettings"));
      }

      const updated = await res.json();
      refetchPrivacy(updated);
      toast.success(t("privacy.settingsSaved"));
      onOpenChange(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t("privacy.failedSaveSettings");
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [session, privacyState, refetchPrivacy, onOpenChange, t]);

  // Register footer buttons inside settings modal
  useEffect(() => {
    if (!setFooterContent) return;

    setFooterContent(
      <div className="flex items-center justify-end w-full gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          className="text-xs h-9 px-4 rounded-xl cursor-pointer"
        >
          {t("cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSaveSettings}
          disabled={isSubmitting}
          className="gap-2 text-xs font-semibold h-9 px-5 rounded-xl cursor-pointer bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          {isSubmitting ? (
            <Spinner className="size-3.5" />
          ) : (
            <Save className="size-3.5" />
          )}
          <span>{isSubmitting ? t("saving") : t("saveChanges")}</span>
        </Button>
      </div>,
    );

    return () => setFooterContent(null);
  }, [setFooterContent, onOpenChange, handleSaveSettings, isSubmitting, t]);

  // App tabs configuration for RrPillNav
  const appTabs: RrPillNavItem<PrivacyAppId>[] = useMemo(
    () => [
      { id: "aquila", label: "Aquila" },
      { id: "polaris", label: "Polaris" },
      { id: "lynx", label: "Lynx" },
    ],
    [],
  );

  if (privacyLoading) {
    return (
      <div className="items-center justify-center py-16 flex flex-col gap-3 h-full">
        <Spinner className="size-6 text-primary" />
        <p className="text-xs text-muted-foreground">{t("privacy.loadingSettings")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0 h-full text-left">
      {/* App Sub-Navigation Pills (anchored to top right) */}
      <div className="flex items-center justify-end w-full shrink-0">
        <RrPillNav
          items={appTabs}
          activeId={activeApp}
          onChange={(id) => setActiveApp(id as PrivacyAppId)}
          layoutId="privacyAppSubTabs"
        />
      </div>

      {/* Main Card Container filling remaining space */}
      <Card className="flex-1 flex flex-col min-h-0 h-full border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3 scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeApp}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeApp === "aquila" && (
                <RrAquilaPrivacySubTab
                  privacyState={privacyState}
                  onLevelChange={handleLevelChange}
                  disabled={isSubmitting}
                />
              )}
              {activeApp === "polaris" && (
                <RrPolarisPrivacySubTab
                  privacyState={privacyState}
                  onLevelChange={handleLevelChange}
                  disabled={isSubmitting}
                />
              )}
              {activeApp === "lynx" && (
                <RrLynxPrivacySubTab
                  privacyState={privacyState}
                  onLevelChange={handleLevelChange}
                  disabled={isSubmitting}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

export default RrPrivacySettingsTab;
