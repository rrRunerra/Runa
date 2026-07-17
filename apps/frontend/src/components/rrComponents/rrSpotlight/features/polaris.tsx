import React from "react";
import { BaseSpotlightFeature, SpotlightAction, SpotlightActionContext } from "../BaseSpotlightFeature";
import { User, Settings, KeyRound, Bookmark, Compass } from "lucide-react";
import { REFERENCE_CONSTELLATIONS } from "@/lib/constellations";

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
        label: context.t("spotlight.myProfile"),
        category: "Actions",
        icon: <User className="size-4 text-foreground/70" />,
        badge: context.t("spotlight.accountDetails"),
        action: () => {
          window.location.href = `/polaris/user/${context.username}`;
        },
      });
    }

    // 1. Reference constellations navigation actions (only available on /polaris dashboard)
    if (context.pathname === "/polaris") {
      for (const c of REFERENCE_CONSTELLATIONS) {
        actions.push({
          id: `action-polaris-navigate-${c.id}`,
          label: context.t("spotlight.navigateConstellation", { name: c.name }),
          category: "Navigation",
          icon: <Compass className="size-4 text-primary" />,
          badge: context.t("spotlight.appConstellation"),
          action: () => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("runa-star-map-navigate", {
                  detail: { constellationName: c.name },
                })
              );
              window.dispatchEvent(new CustomEvent("runa-close-spotlight"));
            }
          },
        });
      }

      // 2. Fetch and show Bookmarks dynamically if token is present
      if (context.accessToken) {
        try {
          const now = Date.now();
          const handleBookmarkAction = (b: any) => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("runa-star-map-navigate", {
                  detail: { constellationName: b.name },
                })
              );
              window.dispatchEvent(new CustomEvent("runa-close-spotlight"));
            }
          };

          if (cachedBookmarks && (now - lastFetched < CACHE_DURATION)) {
            for (const b of cachedBookmarks) {
              actions.push({
                id: `action-polaris-bookmark-${b.id}`,
                label: context.t("spotlight.navigateConstellation", { name: b.name }),
                category: "Navigation",
                icon: <Bookmark className="size-4 text-primary" />,
                badge: context.t("spotlight.savedConstellation"),
                action: () => handleBookmarkAction(b),
              });
            }
          } else {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookmarks`, {
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
                    label: context.t("spotlight.navigateConstellation", { name: b.name }),
                    category: "Navigation",
                    icon: <Bookmark className="size-4 text-primary" />,
                    badge: context.t("spotlight.savedConstellation"),
                    action: () => handleBookmarkAction(b),
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch bookmarks in spotlight", err);
        }
      }
    }

    return actions;
  }
}
