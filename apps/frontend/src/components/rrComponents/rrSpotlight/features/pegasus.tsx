import React from "react";
import {
  BaseSpotlightFeature,
  SpotlightAction,
  SpotlightActionContext,
} from "../BaseSpotlightFeature";
import { Mail, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default class PegasusSpotlightFeature extends BaseSpotlightFeature {
  id = "pegasus";
  name = "Pegasus";

  async getActions(
    context: SpotlightActionContext,
  ): Promise<SpotlightAction[]> {
    const actions: SpotlightAction[] = [];

    // 1. Check if Encryption is locked
    if (!context.isEncryptionUnlocked) {
      actions.push({
        id: "pegasus-unlock-warning",
        label: context.t("spotlight.unlockEmailsWarning"),
        category: "Actions",
        icon: <ShieldAlert className="size-4 text-warning" />,
        badge: context.t("spotlight.pegasusEncrypted"),
        action: () => {
          context.setShowUnlockDialog(true);
        },
      });
      return actions;
    }

    return actions;
  }
}
