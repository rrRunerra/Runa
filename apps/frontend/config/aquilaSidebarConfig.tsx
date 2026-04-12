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

export const getAquilaSidebarConfig = (
  session: any,
  userConnections: any[] = [],
): NavbarConfig => [
  {
    section: "",
    items: [
      {
        label: "Home",
        href: "/aquila",
        icon: <Home className="h-4 w-4" />,
        subtitle: "Home",
      },
      {
        label: "Browse",
        href: "/aquila/browse",
        icon: <Search className="h-4 w-4" />,
        subtitle: "Browse",
      },
    ],
  },
  {
    section: "Library",
    items: [
      {
        label: "Anime",
        href: `/aquila/user/${session?.user?.id}/anime`,
        icon: <Film className="h-4 w-4" />,
        subtitle: "Anime",
      },
      {
        label: "Manga",
        href: `/aquila/user/${session?.user?.id}/manga`,
        icon: <Book className="h-4 w-4" />,
        subtitle: "Manga",
      },
      {
        label: "Movies",
        href: `/aquila/user/${session?.user?.id}/movies`,
        icon: <Tv2 className="h-4 w-4" />,
        subtitle: "Movies",
      },
      {
        label: "TV Shows",
        href: `/aquila/user/${session?.user?.id}/tv`,
        icon: <Tv className="h-4 w-4" />,
        subtitle: "TV Shows",
      },
      // {
      //   label: "Games",
      //   href: `/aquila/user/${session?.user?.id}/games`,
      //   icon: <Gamepad className="h-4 w-4" />,
      //   subtitle: "Games",
      // },
      // {
      //   label: "Books",
      //   href: `/aquila/user/${session?.user?.id}/books`,
      //   icon: <BookA className="h-4 w-4" />,
      //   subtitle: "Books",
      // },
      // {
      //   label: "Music",
      //   href: `/aquila/user/${session?.user?.id}/music`,
      //   icon: <Music className="h-4 w-4" />,
      //   subtitle: "Music",
      // },
    ],
  },
  {
    // idk if it will stay like this or not |  either this or aniyomi style or even both idk
    section: "Connections",
    items: (userConnections || []).map(
      (connection: { provider: string; username: string }) => {
        return {
          label: `${connection.provider} / ${connection.username}`,
          href: `/aquila/user/${session?.user?.id}/connections/${connection.provider.toLowerCase()}`,
          icon: <List className="h-4 w-4" />,
          subtitle: connection.provider,
        };
      },
    ),
  },
];
