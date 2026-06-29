import React from "react";
import {
  BaseSpotlightFeature,
  SpotlightAction,
  SpotlightActionContext,
} from "../BaseSpotlightFeature";
import { Play, SkipForward, Music } from "lucide-react";
import { LyraFlags, hasPermission } from "@runa/permissions";

/**
 * LYRA SPOTLIGHT FEATURE
 *
 * Documentation & Skeletons:
 * Lyra is the music playback application.
 * Exposes audio stream control, playlist queues, and media details.
 */
export default class LyraSpotlightFeature extends BaseSpotlightFeature {
  id = "lyra";
  name = "Lyra";

  getActions(context: SpotlightActionContext): SpotlightAction[] {
    const canView = hasPermission(
      context.userPermissions,
      [LyraFlags.VIEW],
      "any",
    );
    if (!canView) {
      return [];
    }

    const actions: SpotlightAction[] = [];

    return actions;
  }
}
