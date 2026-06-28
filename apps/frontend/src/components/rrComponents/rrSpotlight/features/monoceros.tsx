import React from "react";
import {
  BaseSpotlightFeature,
  SpotlightAction,
  SpotlightActionContext,
} from "../BaseSpotlightFeature";
import { ShieldCheck, ToggleLeft } from "lucide-react";
import { MonocerosFlags, hasPermission } from "@runa/permissions";

/**
 * MONOCEROS SPOTLIGHT FEATURE
 *
 * Documentation & Skeletons:
 * Monoceros provides dashboard administration, logs, and feature flag management.
 */
export default class MonocerosSpotlightFeature extends BaseSpotlightFeature {
  id = "monoceros";
  name = "Monoceros";

  getActions(context: SpotlightActionContext): SpotlightAction[] {
    const canView = hasPermission(
      context.userPermissions,
      [MonocerosFlags.VIEW],
      "any",
    );
    if (!canView) {
      return [];
    }
    const actions: SpotlightAction[] = [];
    return actions;
  }
}
