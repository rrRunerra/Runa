import React from "react";
import {
  BaseSpotlightFeature,
  SpotlightAction,
  SpotlightActionContext,
} from "../BaseSpotlightFeature";
import { File, Upload } from "lucide-react";
import { LacertaFlags, hasPermission } from "@runa/permissions";

/**
 * LACERTA SPOTLIGHT FEATURE
 *
 * Documentation & Skeletons:
 * Lacerta manages cloud files and folders.
 * Allows searching storage files and quick file uploads.
 */
export default class LacertaSpotlightFeature extends BaseSpotlightFeature {
  id = "lacerta";
  name = "Lacerta";

  getActions(context: SpotlightActionContext): SpotlightAction[] {
    const canView = hasPermission(
      context.userPermissions,
      [LacertaFlags.VIEW],
      "any",
    );
    if (!canView) {
      return [];
    }

    const actions: SpotlightAction[] = [];

    return actions;
  }
}
