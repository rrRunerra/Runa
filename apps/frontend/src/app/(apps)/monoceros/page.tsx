"use client";

import { useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  ShieldAlert,
  Loader2,
  RefreshCw,
  LayoutDashboard,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { hasPermission, RunaFlags } from "@runa/permissions";

import { triggerMediaRefresh } from "@/actions/monocerosMediaActions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function MonocerosPage() {
  const { data: session, status } = useSession();
  const [isPending, startTransition] = useTransition();

  // Redirect unauthorized users
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/monoceros/unauthorized");
    }
    if (
      status === "authenticated" &&
      session?.user?.permissions &&
      !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)
    ) {
      redirect("/monoceros/unauthorized");
    }
  }, [status, session]);

  const handleManualRefresh = () => {
    startTransition(async () => {
      try {
        const res = await triggerMediaRefresh();
        if (res.success) {
          toast.success(
            res.message || "Media update job triggered successfully.",
          );
        } else {
          toast.error(res.error || "Failed to trigger media update.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      }
    });
  };

  if (status === "loading") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <LayoutDashboard className="size-8 text-primary" />
            Monoceros Admin Control Center
          </h1>
          <p className="text-sm text-muted-foreground">
            System administration, database control, and maintenance operations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Media Refresh Card */}
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="space-y-1 bg-linear-to-r from-primary/5 to-transparent pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2 text-foreground font-semibold">
                  <Layers className="size-5 text-primary" />
                  Media Updates Job
                </CardTitle>
                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-medium">
                  Active Schedule
                </div>
              </div>
              <CardDescription>
                Weekly background maintenance job for release updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 text-sm">
                  <Calendar className="size-4.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Weekly Run</p>
                    <p className="text-xs text-muted-foreground">
                      Scheduled to run automatically every Sunday at midnight.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-sm">
                  <RefreshCw className="size-4.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Target Scope</p>
                    <p className="text-xs text-muted-foreground">
                      Forces metadata refresh for all Anime, Manga, Book, Game,
                      Movie, and TV shows released in the past 3 months.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
          <CardFooter className="border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              /media-update/refresh
            </span>
            <Button
              onClick={handleManualRefresh}
              disabled={isPending}
              size="sm"
              className="gap-1.5 shadow-sm"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Trigger Now
            </Button>
          </CardFooter>
        </Card>

        {/* Info/Warning Card */}
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="space-y-1 bg-linear-to-r from-amber-500/5 to-transparent pb-4">
              <CardTitle className="text-xl flex items-center gap-2 text-foreground font-semibold">
                <ShieldAlert className="size-5 text-amber-500" />
                Security Warning
              </CardTitle>
              <CardDescription>
                Maintenance operations can affect system resource usage.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 text-sm text-muted-foreground space-y-2">
              <p>
                Manually triggering the weekly media refresh will scan the
                database and start batch API requests to external providers
                (AniList, TVDB, RAWG, Google Books).
              </p>
              <p>
                To prevent rate-limiting issues, please avoid triggering this
                job consecutively.
              </p>
            </CardContent>
          </div>
          <CardFooter className="border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20 px-6 py-4 flex items-center justify-end">
            <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
              Admin Access Only
              <ChevronRight className="size-3.5" />
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
