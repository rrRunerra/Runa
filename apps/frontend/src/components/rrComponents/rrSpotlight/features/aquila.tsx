import React from "react";
import {
  BaseSpotlightFeature,
  SpotlightAction,
  SpotlightActionContext,
} from "../BaseSpotlightFeature";
import { Film, ListPlus, Shuffle, Compass } from "lucide-react";
import { toast } from "sonner";

export default class AquilaSpotlightFeature extends BaseSpotlightFeature {
  id = "aquila";
  name = "Aquila";

  async getActions(
    context: SpotlightActionContext,
  ): Promise<SpotlightAction[]> {
    const actions: SpotlightAction[] = [];

    // 2. Spin Planned Roulette (parameterized)
    actions.push({
      id: "action-aquila-roulette",
      label: context.t("spotlight.spinMediaRoulette"),
      category: "Actions",
      icon: <Shuffle className="size-4 text-primary" />,
      badge: context.t("spotlight.pickRandomPlanned"),
      parameters: [
        {
          name: "mediaType",
          label: context.t("spotlight.mediaType"),
          type: "select",
          options: [
            { label: context.t("spotlight.anime"), value: "anime" },
            { label: context.t("spotlight.manga"), value: "manga" },
            { label: context.t("spotlight.tvShows"), value: "tv" },
            { label: context.t("spotlight.movies"), value: "movies" },
            { label: context.t("spotlight.games"), value: "games" },
            { label: context.t("spotlight.books"), value: "books" },
          ],
        },
      ],
      action: (params) => {
        if (!params || !params.mediaType) return;
        window.dispatchEvent(
          new CustomEvent("runa-open-roulette", {
            detail: { mediaType: params.mediaType },
          }),
        );
      },
    });

    // 3. Search Media (parameterized redirect)
    actions.push({
      id: "action-aquila-search",
      label: context.t("spotlight.searchMedia"),
      category: "Actions",
      icon: <Compass className="size-4 text-primary" />,
      badge: context.t("spotlight.searchRedirectBrowse"),
      parameters: [
        {
          name: "type",
          label: context.t("spotlight.mediaType"),
          type: "select",
          options: [
            { label: context.t("spotlight.anime"), value: "anime" },
            { label: context.t("spotlight.manga"), value: "manga" },
            { label: context.t("spotlight.tvShows"), value: "tv" },
            { label: context.t("spotlight.movies"), value: "movies" },
            { label: context.t("spotlight.games"), value: "games" },
            { label: context.t("spotlight.books"), value: "books" },
          ],
        },
        {
          name: "title",
          label: context.t("spotlight.titleParam"),
          type: "text",
        },
      ],
      action: (params) => {
        if (!params || !params.type) return;
        const query = params.title || "";
        const formattedQuery = encodeURIComponent(query.trim()).replace(/%20/g, "+");
        window.location.href = `/aquila/browse?type=${params.type}&q=${formattedQuery}`;
      },
    });

    return actions;
  }
}
