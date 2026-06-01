"use client";
import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { MediaListDisplay } from "../../../../../../components/aquila/media-list/MediaListDisplay";
import {
  MediaEntry,
  DisplayType,
  MediaFilters,
} from "../../../../../../components/aquila/media-list/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "next-auth/react";
import * as Lucide from "lucide-react";

export default function UserMoviesPage() {
  const params = useParams();
  const username = params.name as string;
  const { data: session } = useSession();

  if (!username) {
    return <div>Username not found</div>;
  }

  const isOwner = session?.user?.username === username;

  const [displayType, setDisplayType] = useState<DisplayType>("grid");
  const [search, setSearch] = useState("");
  const [activeList, setActiveList] = useState("All");
  const [filters, setFilters] = useState<MediaFilters>({
    format: "",
    status: "",
    genres: [],
    country: "",
  });
  const [sort, setSort] = useState<
    "title" | "score" | "progress" | "last_updated" | "last_added"
  >("last_updated");

  const [userData, setUserData] = useState<{
    username: string;
    displayName?: string;
    avatarUrl?: string;
  } | null>(null);

  const [moviesList, setMoviesList] = useState<MediaEntry[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (username) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${username}`)
        .then(async (res) => await res.json())
        .then((data) => setUserData(data))
        .catch((err) => console.error("Failed to fetch user data", err));
    }
  }, [username]);

  const fetchMoviesList = () => {
    if (username) {
      const headers: HeadersInit = {};
      if (session?.accessToken) {
        headers["Authorization"] = `Bearer ${session.accessToken}`;
      }

      fetch(`${process.env.NEXT_PUBLIC_API_URL}/list/movie/user/${username}`, {
        headers,
      })
        .then(async (res) => {
          if (res.status === 403) {
            setIsPrivate(true);
            return null;
          }
          if (res.ok) {
            return res.json();
          }
          throw new Error("Failed to fetch list");
        })
        .then((data) => {
          if (data && data.statusCode !== 404) {
            setMoviesList(data);
            setIsPrivate(false);
          }
        })
        .catch((err) => console.error("Failed to fetch movies list", err));
    }
  };

  useEffect(() => {
    fetchMoviesList();
  }, [username, session]);

  useEffect(() => {
    if (!userData) return;
    document.title = `Aquila > User > ${userData?.displayName || userData?.username} > Movies List`;
  }, [userData]);

  const lists = ["All", "Completed", "Dropped", "Planning"];

  const resetFilters = () => {
    setSearch("");
    setActiveList("All");
    setFilters({
      format: "",
      status: "",
      genres: [],
      country: "",
    });
    setSort("last_updated");
  };

  // Apply quick search and list filtering here for the Display component
  const filteredData = useMemo(() => {
    return moviesList.filter((entry) => {
      if (search && !entry.title.toLowerCase().includes(search.toLowerCase()))
        return false;

      if (activeList !== "All") {
        if (!entry.status.toLowerCase().includes(activeList.toLowerCase()))
          return false;
      }

      return true;
    });
  }, [search, activeList, moviesList]);  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const SidebarContents = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {/* Search */}
      <div className="relative">
        <Lucide.Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Filter"
          className="pl-9 h-9 bg-muted/30 border-none focus-visible:ring-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Lists navigation */}
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 px-3">
          Lists
        </Label>
        {lists.map((list) => (
          <button
            key={list}
            onClick={() => {
              setActiveList(list);
              onItemClick?.();
            }}
            className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors text-left ${activeList === list ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
          >
            {list}
          </button>
        ))}
      </div>

      {/* Dynamic Filters */}
      <div className="flex flex-col gap-5 px-1">
        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground -mb-3 px-2">
          Filters
        </Label>

        <div className="space-y-1.5 mt-2">
          <Label className="text-xs font-semibold px-2">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          >
            <SelectTrigger className="h-9 bg-muted/20 border-none shadow-none text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Upcoming">Upcoming</SelectItem>
              <SelectItem value="Released">Released</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold px-2">Sort</Label>
          <Select value={sort} onValueChange={(v: any) => setSort(v)}>
            <SelectTrigger className="h-9 bg-muted/20 border-none shadow-none text-xs">
              <SelectValue placeholder="Title" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="score">Score</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="last_updated">Last Updated</SelectItem>
              <SelectItem value="last_added">Last Added</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-1 mt-2">
        <button
          onClick={resetFilters}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors border border-border/40"
        >
          <Lucide.RotateCcw size={14} />
          Reset
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen gap-6 lg:gap-8 p-4 lg:p-6 lg:pl-2">
      {/* ── Page Sidebar (Left) ────────────────────────── */}
      <aside className="hidden lg:flex w-56 flex-col gap-6 shrink-0 sticky top-6 h-fit">
        <SidebarContents />
      </aside>

      {/* ── Main Content (Right) ────────────────────────── */}
      <main className="flex-1 flex flex-col gap-8 max-w-[1200px]">
        {/* User Profile Header */}
        {userData && (
          <div className="flex items-center gap-4 p-3 sm:p-4 rounded-xl bg-muted/20 border border-border/40 mb-2 shadow-sm">
            <Avatar
              size="lg"
              className="border-2 border-background ring-2 ring-primary/20"
            >
              <AvatarImage src={userData.avatarUrl} alt={userData.username} />
              <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                {userData.displayName?.[0]?.toUpperCase() ||
                  userData.username?.[0]?.toUpperCase() ||
                  "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {`${userData.displayName || userData.username}'s Movies List`}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                @{userData.username}
              </p>
            </div>
          </div>
        )}

        {isPrivate ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/10 border border-border/40 rounded-2xl shadow-sm text-center p-6 mt-4">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Lucide.Lock className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">This list is private</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              The owner of this list has set their privacy preferences to private.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between mt-2">
              <div className="block lg:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 h-9 bg-muted/20 border-border/40"
                    >
                      <Lucide.SlidersHorizontal size={14} />
                      Filters & Lists
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] p-6 bg-background border-r border-border/40">
                    <SheetHeader className="p-0 mb-4">
                      <SheetTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground text-left">
                        Filters & Lists
                      </SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col gap-6 overflow-y-auto pr-1">
                      <SidebarContents onItemClick={() => setIsSheetOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/40 shadow-sm ml-auto">
                {[
                  { type: "list", icon: <Lucide.List size={16} /> },
                  { type: "compact", icon: <Lucide.LayoutList size={16} /> },
                  { type: "grid", icon: <Lucide.LayoutGrid size={16} /> },
                ].map((view) => (
                  <button
                    key={view.type}
                    onClick={() => setDisplayType(view.type as DisplayType)}
                    className={`flex items-center justify-center size-8 rounded-md transition-all ${displayType === view.type ? "bg-background text-foreground shadow-md ring-1 ring-border/50" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                  >
                    {view.icon}
                  </button>
                ))}
              </div>
            </header>

            <MediaListDisplay
              lists={
                activeList === "All"
                  ? ["Completed", "Dropped", "Planning"]
                  : [activeList]
              }
              data={filteredData}
              displayType={displayType}
              filters={filters}
              sort={sort}
              baseUrl="/aquila/movies"
              isOwner={isOwner}
              onRefresh={fetchMoviesList}
            />
          </>
        )}
      </main>
    </div>
  );
}
