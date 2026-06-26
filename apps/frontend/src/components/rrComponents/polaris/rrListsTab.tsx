import React from "react";
import Link from "next/link";
import { Tv, Book, Gamepad2, BookOpen, Film, Lock, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Skeleton } from "@/components/ui/skeleton";

interface ListsTabProps {
  name: string;
  session: any;
}

interface ListCategory {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  redirect: string;
}

interface ListApiResponse {
  counts?: Record<string, number>;
}

function RrListCategoryCard({
  username,
  category,
  session,
}: {
  username: string;
  category: ListCategory;
  session: any;
}): React.ReactElement {
  const Icon = category.icon;
  const url = username
    ? `${process.env.NEXT_PUBLIC_API_URL}/list/${category.id}/user/${username}?limit=1`
    : null;

  const { data, error, isLoading } = useSWR<ListApiResponse>(
    url ? [url, session?.accessToken] : null,
    fetcher
  );

  const loading = isLoading;

  if (loading) {
    return (
      <Card className="flex flex-col justify-between overflow-hidden bg-card shadow-sm border">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8.5 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-8 rounded-full" />
        </CardHeader>
        <CardContent className="pt-4 flex-1 flex flex-col gap-4">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // If there's an error, we assume the list is private or unavailable
  const isPrivate = !!error;
  const counts = data?.counts || {};
  const total = counts.all || 0;

  // Breakdown calculations
  const activeCount = (counts.watching || 0) + (counts.reading || 0) + (counts.playing || 0);
  const completedCount = counts.completed || 0;
  const planningCount = counts.planning || 0;
  const otherCount = (counts.on_hold || 0) + (counts.dropped || 0);

  const activePct = total > 0 ? (activeCount / total) * 100 : 0;
  const completedPct = total > 0 ? (completedCount / total) * 100 : 0;
  const planningPct = total > 0 ? (planningCount / total) * 100 : 0;
  const otherPct = total > 0 ? (otherCount / total) * 100 : 0;

  return (
    <Card className="flex flex-col justify-between overflow-hidden group border shadow-sm bg-card hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Icon className="size-4.5" aria-hidden="true" />
          </div>
          <CardTitle className="text-sm font-semibold">{category.title}</CardTitle>
        </div>
        {isPrivate ? (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-semibold py-0">
            Private
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-semibold text-xs">
            {total}
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="pt-4 flex-1 flex flex-col justify-between gap-4">
        {isPrivate ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/60 gap-1.5">
            <Lock className="size-6 text-destructive/40" aria-hidden="true" />
            <span className="text-xs italic">User has set this tracker list to private.</span>
          </div>
        ) : total > 0 ? (
          <div className="flex flex-col gap-4">
            {/* Segmented Progress Bar */}
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
              {completedCount > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${completedPct}%` }}
                  title={`Completed: ${completedCount}`}
                />
              )}
              {activeCount > 0 && (
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${activePct}%` }}
                  title={`Active: ${activeCount}`}
                />
              )}
              {planningCount > 0 && (
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${planningPct}%` }}
                  title={`Planning: ${planningCount}`}
                />
              )}
              {otherCount > 0 && (
                <div
                  className="h-full bg-secondary transition-all"
                  style={{ width: `${otherPct}%` }}
                  title={`On Hold/Dropped: ${otherCount}`}
                />
              )}
            </div>
            
            {/* Status Counts Breakdown */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  <span>Completed</span>
                </div>
                <span className="font-semibold text-foreground">{completedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="size-1.5 rounded-full bg-blue-500" />
                  <span>Active</span>
                </div>
                <span className="font-semibold text-foreground">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="size-1.5 rounded-full bg-purple-500" />
                  <span>Planning</span>
                </div>
                <span className="font-semibold text-foreground">{planningCount}</span>
              </div>
              {otherCount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-secondary" />
                    <span>Other</span>
                  </div>
                  <span className="font-semibold text-foreground">{otherCount}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/60">
            <span className="text-xs italic">No items tracked yet.</span>
          </div>
        )}
        
        {/* Redirect Button */}
        {!isPrivate && total > 0 && (
          <Link href={category.redirect} className="w-full mt-2 block rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/50">
            <Button
              variant="outline"
              className="w-full justify-between items-center text-xs h-8 border border-input hover:text-foreground rounded-lg cursor-pointer"
            >
              <span>View Tracker List</span>
              <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default function RrListsTab({ name, session }: ListsTabProps): React.ReactNode {
  const categories: ListCategory[] = [
    { id: "anime", title: "Anime List", icon: Tv, redirect: `/aquila/user/${name}/anime` },
    { id: "manga", title: "Manga List", icon: BookOpen, redirect: `/aquila/user/${name}/manga` },
    { id: "tv", title: "TV Shows", icon: Tv, redirect: `/aquila/user/${name}/tv` },
    { id: "movie", title: "Movies", icon: Film, redirect: `/aquila/user/${name}/movies` },
    { id: "game", title: "Video Games", icon: Gamepad2, redirect: `/aquila/user/${name}/games` },
    { id: "book", title: "Books", icon: Book, redirect: `/aquila/user/${name}/books` },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {categories.map((cat) => (
        <RrListCategoryCard
          key={cat.id}
          username={name}
          category={cat}
          session={session}
        />
      ))}
    </div>
  );
}
