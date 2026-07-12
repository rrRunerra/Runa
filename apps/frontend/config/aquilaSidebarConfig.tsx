"use client";

import {
  Book,
  Film,
  Home,
  Gamepad,
  List,
  Search,
  Tv,
  Tv2,
  Music,
  BookA,
  Compass,
  Calendar,
  User,
  Users,
} from "lucide-react";

import type { NavbarConfig } from "@/types/NavbarConfig";
import { AquilaFlags, RunaFlags } from "@runa/permissions";
import { SidebarConfig } from "@/types/SidebarConfig";

export const getAquilaSidebarConfig = (
  session: any,
  userConnections: any[] = [],
): SidebarConfig => [
  {
    section: "#$Phone",
    items: [
      {
        label: "Home",
        href: "/aquila",
        preventRedirect: false,
        icon: <Home className="h-4 w-4" />,
        subtitle: "Home",
        position: 1,
      },
      {
        label: "Browse",
        href: "/aquila/browse",
        icon: <Search className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Browse",
        position: 2,
      },
      {
        label: "Calendar",
        href: "/aquila/calendar",
        icon: <Calendar className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Calendar",
        position: 3,
      },
      {
        label: "Discover",
        href: "/aquila/discover",
        icon: <Compass className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Discover",
        position: 4,
        children: [
          {
            label: "Anime",
            href: "/aquila/discover/anime",
            preventRedirect: false,
            subtitle: "Anime",
            icon: <Film className="h-3.5 w-3.5" />,
          },
          {
            label: "Manga",
            href: "/aquila/discover/manga",
            preventRedirect: false,
            subtitle: "Manga",
            icon: <Book className="h-3.5 w-3.5" />,
          },
          {
            label: "Movies",
            href: "/aquila/discover/movies",
            preventRedirect: false,
            subtitle: "Movies",
            icon: <Tv2 className="h-3.5 w-3.5" />,
          },
          {
            label: "TV Shows",
            href: "/aquila/discover/tv",
            preventRedirect: false,
            subtitle: "TV Shows",
            icon: <Tv className="h-3.5 w-3.5" />,
          },
          {
            label: "Games",
            href: "/aquila/discover/games",
            preventRedirect: false,
            subtitle: "Games",
            icon: <Gamepad className="h-3.5 w-3.5" />,
          },
          {
            label: "Books",
            href: "/aquila/discover/books",
            preventRedirect: false,
            subtitle: "Books",
            icon: <BookA className="h-3.5 w-3.5" />,
          },
          {
            label: "Characters",
            href: "/aquila/discover/characters",
            preventRedirect: false,
            subtitle: "Characters",
            icon: <User className="h-3.5 w-3.5" />,
          },
          {
            label: "Actors",
            href: "/aquila/discover/actors",
            preventRedirect: false,
            subtitle: "Actors",
            icon: <Users className="h-3.5 w-3.5" />,
          },
        ],
      },
    ],
  },
  {
    section: "",
    items: [
      {
        label: "Home",
        href: "/aquila",
        icon: <Home className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Home",
      },
      {
        label: "Browse",
        href: "/aquila/browse",
        icon: <Search className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Browse",
      },
      {
        label: "Calendar",
        href: "/aquila/calendar",
        icon: <Calendar className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Calendar",
      },
      {
        label: "Discover",
        href: "/aquila/discover",
        icon: <Compass className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Discover",
        children: [
          {
            label: "Anime",
            href: "/aquila/discover/anime",
            preventRedirect: false,
            subtitle: "Anime",
            icon: <Film className="h-3.5 w-3.5" />,
          },
          {
            label: "Manga",
            href: "/aquila/discover/manga",
            preventRedirect: false,
            subtitle: "Manga",
            icon: <Book className="h-3.5 w-3.5" />,
          },
          {
            label: "Movies",
            href: "/aquila/discover/movies",
            preventRedirect: false,
            subtitle: "Movies",
            icon: <Tv2 className="h-3.5 w-3.5" />,
          },
          {
            label: "TV Shows",
            href: "/aquila/discover/tv",
            preventRedirect: false,
            subtitle: "TV Shows",
            icon: <Tv className="h-3.5 w-3.5" />,
          },
          {
            label: "Games",
            href: "/aquila/discover/games",
            preventRedirect: false,
            subtitle: "Games",
            icon: <Gamepad className="h-3.5 w-3.5" />,
          },
          {
            label: "Books",
            href: "/aquila/discover/books",
            preventRedirect: false,
            subtitle: "Books",
            icon: <BookA className="h-3.5 w-3.5" />,
          },
          {
            label: "Characters",
            href: "/aquila/discover/characters",
            preventRedirect: false,
            subtitle: "Characters",
            icon: <User className="h-3.5 w-3.5" />,
          },
          {
            label: "Actors",
            href: "/aquila/discover/actors",
            preventRedirect: false,
            subtitle: "Actors",
            icon: <Users className="h-3.5 w-3.5" />,
          },
        ],
      },
    ],
  },
  {
    section: "Library",
    permissions: RunaFlags.LOGGED_IN,
    items: [
      {
        label: "Anime",
        href: `/aquila/user/${session?.user?.username}/anime`,
        icon: <Film className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Anime",
      },
      {
        label: "Manga",
        href: `/aquila/user/${session?.user?.username}/manga`,
        icon: <Book className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Manga",
      },
      {
        label: "Movies",
        href: `/aquila/user/${session?.user?.username}/movies`,
        icon: <Tv2 className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Movies",
      },
      {
        label: "TV Shows",
        href: `/aquila/user/${session?.user?.username}/tv`,
        icon: <Tv className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "TV Shows",
      },
      {
        label: "Games",
        href: `/aquila/user/${session?.user?.username}/games`,
        icon: <Gamepad className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Games",
      },
      {
        label: "Books",
        href: `/aquila/user/${session?.user?.username}/books`,
        icon: <BookA className="h-4 w-4" />,
        preventRedirect: false,
        subtitle: "Books",
      },
      // {
      //   label: "Music",
      //   href: `/aquila/user/${session?.user?.username}/music`,
      //   icon: <Music className="h-4 w-4" />,
      //   subtitle: "Music",
      // },
    ],
  },
  {
    // idk if it will stay like this or not |  either this or aniyomi style or even both idk
    section: "Connections",
    permissions: RunaFlags.LOGGED_IN,
    items: (userConnections || []).map(
      (connection: { provider: string; linkedUsername: string }) => {
        return {
          label: `${connection.provider} / ${connection.linkedUsername}`,
          href: `/aquila/user/${session?.user?.username}/connections/${connection.provider.toLowerCase()}`,
          preventRedirect: false,
          icon: <List className="h-4 w-4" />,
          subtitle: connection.provider,
        };
      },
    ),
  },
];
