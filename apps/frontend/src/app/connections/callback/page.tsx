"use client";

import type React from "react";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

/**
 * Inner component that processes search parameters and handles window signaling.
 */
function ConnectionCallbackContent(): React.JSX.Element {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");
  const errorMessage = searchParams.get("message");
  const provider = searchParams.get("provider") || "";

  const isSuccess = successParam === "true";

  useEffect(() => {
    // 1. Notify opener via postMessage
    if (window.opener) {
      try {
        window.opener.postMessage(
          {
            type: "RUNA_OAUTH_RESULT",
            success: isSuccess,
            provider,
            error: errorParam,
            message: errorMessage,
          },
          "*",
        );
        window.opener.focus();
      } catch (err) {
        console.error("Failed to postMessage to opener:", err);
      }
    }

    // 2. Notify via BroadcastChannel
    try {
      const channel = new BroadcastChannel("runa_oauth_channel");
      channel.postMessage({
        type: "RUNA_OAUTH_RESULT",
        success: isSuccess,
        provider,
        error: errorParam,
        message: errorMessage,
      });
      channel.close();
    } catch (err) {
      console.error("BroadcastChannel error:", err);
    }

    // 3. Notify via localStorage event
    try {
      localStorage.setItem(
        "runa_oauth_event",
        JSON.stringify({
          success: isSuccess,
          provider,
          timestamp: Date.now(),
        }),
      );
    } catch {
      // Ignore storage errors
    }

    // 4. If success, try to close current tab
    if (isSuccess) {
      const timer = setTimeout(() => {
        window.close();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, provider, errorParam, errorMessage]);

  const handleClose = (): void => {
    window.close();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background select-none">
      <Card className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl text-center">
        <CardContent className="flex flex-col items-center gap-4 p-0">
          {isSuccess ? (
            <>
              <div className="size-14 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-center text-success shadow-lg shadow-success/10">
                <CheckCircle2 className="size-8" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-base font-bold text-foreground">
                  {t("connections.callbackSuccessTitle")}
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("connections.callbackSuccessDesc")}
                </p>
              </div>
              <Button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl gap-2 mt-2 cursor-pointer font-semibold text-xs"
              >
                {t("connections.closeTabBtn")}
              </Button>
            </>
          ) : (
            <>
              <div className="size-14 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive shadow-lg shadow-destructive/10">
                <XCircle className="size-8" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-base font-bold text-foreground">
                  {t("connections.connectionFailed")}
                </h1>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {errorMessage || errorParam || t("connections.unknownError")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full rounded-xl gap-2 mt-2 cursor-pointer text-xs"
              >
                {t("connections.closeTabBtn")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConnectionCallbackPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-xs text-muted-foreground">
          Processing...
        </div>
      }
    >
      <ConnectionCallbackContent />
    </Suspense>
  );
}
