import React from "react";
import {
  BaseSpotlightFeature,
  SpotlightAction,
  SpotlightActionContext,
} from "../BaseSpotlightFeature";
import { MessageSquare, Send, ShieldAlert } from "lucide-react";
import { AquariusFlags, hasPermission } from "@runa/permissions";

/**
 * AQUARIUS SPOTLIGHT FEATURE
 *
 * Documentation & Skeletons:
 * Aquarius provides encrypted site-wide social messaging and feed searches.
 * Data payload is secured inside the secure storage.
 */
export default class AquariusSpotlightFeature extends BaseSpotlightFeature {
  id = "aquarius";
  name = "Aquarius";

  getActions(context: SpotlightActionContext): SpotlightAction[] {
    // 1. Respect user permissions
    const canView = hasPermission(
      context.userPermissions,
      [AquariusFlags.VIEW],
      "any",
    );
    if (!canView) {
      return [];
    }

    const actions: SpotlightAction[] = [];

    // 2. Encryption gating check
    if (!context.isE2eeUnlocked) {
      actions.push({
        id: "aquarius-unlock-warning",
        label: "Unlock Encryption to search social messages",
        category: "Actions",
        icon: <ShieldAlert className="size-4 text-warning" />,
        badge: "Aquarius (Encrypted)",
        action: () => {
          context.setShowUnlockDialog(true);
        },
      });
      return actions;
    }

    return actions;
  }
}
