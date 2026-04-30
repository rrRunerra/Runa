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
import * as Lucide from "lucide-react";

export default function UserAnimePage() {
  const params = useParams();
  const userId = params.id as string;

  if (!userId) {
    return <div>User not found</div>;
  }

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

  const [animeList, setAnimeList] = useState<MediaEntry[]>([]);

  useEffect(() => {
    if (userId) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${userId}`)
        .then(async (res) => await res.json())
        .then((data) => setUserData(data))
        .catch((err) => console.error("Failed to fetch user data", err));
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/list/anime/user/${userId}`)
        .then(async (res) => await res.json())
        .then((data) => {
          if (data.statusCode !== 404) {
            setAnimeList(data);
          }
        })
        .catch((err) => console.error("Failed to fetch anime list", err));
    }
  }, [userId]);

  useEffect(() => {
    if (!userData) return;
    document.title = `Aquila | ${userData?.displayName || userData?.username}'s Anime List`;
  }, [userData]);

  const lists = ["All", "Watching", "Completed", "Dropped", "Planning"];

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
    return animeList.filter((entry) => {
      if (search && !entry.title.toLowerCase().includes(search.toLowerCase()))
        return false;

      if (activeList !== "All") {
        if (!entry.status.toLowerCase().includes(activeList.toLowerCase()))
          return false;
      }

      return true;
    });
  }, [search, activeList, animeList]);

  return (
    <div className="flex w-full min-h-screen gap-8 p-6 pl-2">
      {/* ── Page Sidebar (Left) ────────────────────────── */}
      <aside className="w-56 flex flex-col gap-6 shrink-0 sticky top-6 h-fit">
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
              onClick={() => setActiveList(list)}
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
            <Label className="text-xs font-semibold px-2">Format</Label>
            <Select
              value={filters.format}
              onValueChange={(v) => setFilters((f) => ({ ...f, format: v }))}
            >
              <SelectTrigger className="h-9 bg-muted/20 border-none shadow-none text-xs">
                <SelectValue placeholder="All Formats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TV">TV</SelectItem>
                <SelectItem value="Movie">Movie</SelectItem>
                <SelectItem value="OVA">OVA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold px-2">Status</Label>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger className="h-9 bg-muted/20 border-none shadow-none text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Finished">Finished</SelectItem>
                <SelectItem value="Airing">Airing</SelectItem>
                <SelectItem value="Not Yet Aired">Not Yet Aired</SelectItem>
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
      </aside>

      {/* ── Main Content (Right) ────────────────────────── */}
      <main className="flex-1 flex flex-col gap-8 max-w-[1200px]">
        {/* User Profile Header */}
        {userData && (
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/40 mb-2 shadow-sm">
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
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {`${userData.displayName || userData.username}'s Anime List`}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                @{userData.username}
              </p>
            </div>
          </div>
        )}

        <header className="flex items-center justify-between mt-2">
          {/* <h1 className="text-2xl font-bold text-foreground">
            {activeList === "All" ? "Anime List" : activeList}
          </h1> */}

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
              ? ["Watching", "Completed TV"]
              : [activeList === "Completed" ? "Completed TV" : activeList]
          }
          data={filteredData}
          displayType={displayType}
          filters={filters}
          sort={sort}
          baseUrl="/aquila/anime"
        />
      </main>
    </div>
  );
}
