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
} from "lucide-react";

import type { NavbarConfig } from "@/types/NavbarConfig";
import { AquilaFlags } from "@runa/permissions";
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
    ],
  },
  {
    section: "Library",
    permissions: AquilaFlags.LOGGED_IN,
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
    permissions: AquilaFlags.LOGGED_IN,
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
