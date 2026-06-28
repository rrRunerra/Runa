import React from "react";
import { BaseSpotlightFeature, SpotlightAction, SpotlightActionContext } from "../BaseSpotlightFeature";
import { User, Settings, KeyRound, Bookmark } from "lucide-react";

let cachedBookmarks: any[] | null = null;
let lastFetched = 0;
const CACHE_DURATION = 30000; // Cache for 30 seconds

export default class PolarisSpotlightFeature extends BaseSpotlightFeature {
  id = "polaris";
  name = "Polaris";

  async getActions(context: SpotlightActionContext): Promise<SpotlightAction[]> {
    const actions: SpotlightAction[] = [];

    // Profile action
    if (context.username) {
      actions.push({
        id: "action-polaris-profile",
        label: "My Profile",
        category: "Actions",
        icon: <User className="size-4 text-foreground/70" />,
        badge: "Account Details",
        action: () => {
          window.location.href = `/polaris/user/${context.username}`;
        },
      });
    }

    // Fetch and show Bookmarks dynamically if token is present
    if (context.accessToken) {
      try {
        const now = Date.now();
        if (cachedBookmarks && (now - lastFetched < CACHE_DURATION)) {
          for (const b of cachedBookmarks) {
            actions.push({
              id: `action-polaris-bookmark-${b.id}`,
              label: `Bookmark: ${b.name}`,
              category: "Navigation",
              icon: <Bookmark className="size-4 text-primary" />,
              badge: `Saved constellation`,
              action: () => {
                window.location.href = `/polaris?constellation=${b.id}`;
              },
            });
          }
        } else {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/polaris/bookmarks`, {
            headers: {
              Authorization: `Bearer ${context.accessToken}`,
            },
          });
          if (res.ok) {
            const bookmarks = await res.json();
            if (Array.isArray(bookmarks)) {
              cachedBookmarks = bookmarks;
              lastFetched = now;
              for (const b of bookmarks) {
                actions.push({
                  id: `action-polaris-bookmark-${b.id}`,
                  label: `Bookmark: ${b.name}`,
                  category: "Navigation",
                  icon: <Bookmark className="size-4 text-primary" />,
                  badge: `Saved constellation`,
                  action: () => {
                    window.location.href = `/polaris?constellation=${b.id}`;
                  },
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch bookmarks in spotlight", err);
      }
    }

    return actions;
  }
}
