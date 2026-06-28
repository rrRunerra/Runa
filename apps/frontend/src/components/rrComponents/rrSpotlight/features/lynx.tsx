import React from "react";
import {
  BaseSpotlightFeature,
  SpotlightAction,
  SpotlightActionContext,
} from "../BaseSpotlightFeature";
import { Bot, Radio } from "lucide-react";

/**
 * LYNX SPOTLIGHT FEATURE
 *
 * Documentation & Skeletons:
 * Lynx integrates with Discord bot servers and database configurations.
 * Features include managing the bot's status and sending broadcast alerts.
 */
export default class LynxSpotlightFeature extends BaseSpotlightFeature {
  id = "lynx";
  name = "Lynx";

  getActions(context: SpotlightActionContext): SpotlightAction[] {
    const actions: SpotlightAction[] = [];

    return actions;
  }
}
