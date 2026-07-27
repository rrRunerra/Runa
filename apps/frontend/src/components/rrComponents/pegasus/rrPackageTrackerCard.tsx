"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Truck,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  MapPin,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { DetectedPackage } from "./rrPackageTrackerDetector";
import {
  DetailedPackageTracking,
  fetchPackageTrackingDetails,
} from "./rrPackageTrackerService";

interface RrPackageTrackerCardProps {
  packages: DetectedPackage[];
}

export default function RrPackageTrackerCard({
  packages,
}: RrPackageTrackerCardProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [trackingDetails, setTrackingDetails] =
    useState<DetailedPackageTracking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const currentPkg = packages[selectedIndex];

  useEffect(() => {
    if (!currentPkg) return;
    let isMounted = true;
    setLoading(true);

    fetchPackageTrackingDetails(
      currentPkg.carrierId,
      currentPkg.trackingNumber
    ).then((details) => {
      if (isMounted) {
        setTrackingDetails(details);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentPkg]);

  if (!packages || packages.length === 0 || isDismissed) {
    return null;
  }

  const handleCopy = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      // Ignore clipboard error fallback
    }
  };

  const handleRefresh = async () => {
    if (!currentPkg) return;
    setLoading(true);
    const details = await fetchPackageTrackingDetails(
      currentPkg.carrierId,
      currentPkg.trackingNumber
    );
    setTrackingDetails(details);
    setLoading(false);
  };

  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "OUT_FOR_DELIVERY":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "IN_TRANSIT":
      case "SHIPPED":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const steps = [
    { label: t("pegasus.packageTracker.stepPlaced") },
    { label: t("pegasus.packageTracker.stepShipped") },
    { label: t("pegasus.packageTracker.stepInTransit") },
    { label: t("pegasus.packageTracker.stepDelivered") },
  ];

  return (
    <div className="w-full bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl shadow-sm overflow-hidden transition-all duration-200 mb-4">
      {/* Header Bar */}
      <div className="p-4 bg-muted/30 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Truck className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground tracking-wide flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                {t("pegasus.packageTracker.detectedTitle")}
              </span>
              {packages.length > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                  {t("pegasus.packageTracker.multiPackages", {
                    count: packages.length,
                  })}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {currentPkg?.carrierName} • {currentPkg?.trackingNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 text-xs bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-xl transition-all font-semibold cursor-pointer shadow-xs"
            title="Refresh Live Status"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin text-primary")} />
          </button>

          <button
            onClick={() => currentPkg && handleCopy(currentPkg.trackingNumber)}
            className="px-2.5 py-1 text-xs bg-background hover:bg-muted text-foreground border border-border rounded-xl transition-all flex items-center gap-1.5 font-semibold cursor-pointer shadow-xs"
            title={t("pegasus.packageTracker.copyTracking")}
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-600 font-bold">
                  {t("pegasus.packageTracker.copied")}
                </span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-muted-foreground" />
                <span>{t("pegasus.packageTracker.copy")}</span>
              </>
            )}
          </button>

          {currentPkg?.carrierUrl && (
            <a
              href={currentPkg.carrierUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-xs bg-primary text-primary-foreground hover:opacity-90 rounded-xl transition-all flex items-center gap-1.5 font-bold cursor-pointer shadow-xs"
            >
              <span>{t("pegasus.packageTracker.trackOnWeb")}</span>
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Multi-package Tabs if more than one package */}
      {packages.length > 1 && (
        <div className="flex items-center gap-2 px-4 pt-3 overflow-x-auto no-scrollbar border-b border-border/40">
          {packages.map((pkg, idx) => (
            <button
              key={`${pkg.trackingNumber}-${idx}`}
              onClick={() => setSelectedIndex(idx)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-t-xl border-t border-x transition-all flex items-center gap-2 shrink-0 cursor-pointer",
                selectedIndex === idx
                  ? "bg-card border-border text-foreground font-bold"
                  : "bg-muted/40 border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Package className="size-3.5" />
              <span>
                {pkg.carrierName} ({pkg.trackingNumber.slice(-4)})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Body content */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
            <RefreshCw className="size-4 animate-spin text-primary" />
            <span>{t("pegasus.packageTracker.fetchingDetails")}</span>
          </div>
        ) : trackingDetails ? (
          <>
            {/* Status & Estimated Delivery Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border border-border/40">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5",
                    getStatusBadgeStyle(trackingDetails.status),
                  )}
                >
                  {trackingDetails.status === "DELIVERED" ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : trackingDetails.status === "OUT_FOR_DELIVERY" ? (
                    <Truck className="size-3.5" />
                  ) : (
                    <Clock className="size-3.5" />
                  )}
                  <span>
                    {t(
                      `pegasus.packageTracker.status_${trackingDetails.status}`,
                    )}
                  </span>
                </span>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary shrink-0" />
                <span>{t("pegasus.packageTracker.estDelivery")}:</span>
                <span className="font-bold text-foreground">
                  {trackingDetails.estimatedDelivery}
                </span>
              </div>
            </div>

            {/* Step Progress Bar */}
            <div className="pt-2 pb-1">
              <div className="relative flex items-center justify-between w-full">
                {/* Connecting Line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-muted rounded-full z-0">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${(trackingDetails.statusStepIndex / 3) * 100}%`,
                    }}
                  />
                </div>

                {/* Steps Nodes */}
                {steps.map((step, idx) => {
                  const isCompleted = idx <= trackingDetails.statusStepIndex;
                  const isCurrent = idx === trackingDetails.statusStepIndex;

                  return (
                    <div
                      key={step.label}
                      className="relative z-10 flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={cn(
                          "size-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300",
                          isCurrent
                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-110"
                            : isCompleted
                              ? "bg-primary/90 text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border",
                        )}
                      >
                        {isCompleted ? (
                          <Check className="size-3.5 stroke-3" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold tracking-tight text-center hidden sm:block max-w-20",
                          isCurrent
                            ? "text-foreground font-bold"
                            : isCompleted
                              ? "text-foreground/80"
                              : "text-muted-foreground",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collapsible Detailed Event History Timeline */}
            <div className="border-t border-border/40 pt-3">
              <button
                onClick={() => setShowHistory((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground font-semibold py-1 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" />
                  {t("pegasus.packageTracker.viewDetailedHistory")} (
                  {trackingDetails.events.length})
                </span>
                {showHistory ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>

              {showHistory && (
                <div className="mt-3 space-y-3 pl-2 pt-2 border-l-2 border-primary/30 ml-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  {trackingDetails.events.map((event) => (
                    <div key={event.id} className="relative pl-4 space-y-0.5">
                      <div className="absolute -left-3.25 top-1 size-2 rounded-full bg-primary border-2 border-card" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-xs font-bold text-foreground">
                          {event.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {event.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {event.description}
                      </p>
                      <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 pt-0.5">
                        <MapPin className="size-3" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/20 border border-border/40 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="size-4 text-amber-500 shrink-0" />
              <span>
                {t(
                  "pegasus.packageTracker.noLiveData",
                  "No live data returned from carrier API yet. Use 'Track Package' to check directly on carrier portal."
                )}
              </span>
            </div>
            {currentPkg?.carrierUrl && (
              <a
                href={currentPkg.carrierUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>{t("pegasus.packageTracker.trackOnWeb")}</span>
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
