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
      label: "Spin Media Roulette",
      category: "Actions",
      icon: <Shuffle className="size-4 text-primary" />,
      badge: "Pick a random planned title",
      parameters: [
        {
          name: "mediaType",
          label: "Media Type",
          type: "select",
          options: [
            { label: "Anime", value: "anime" },
            { label: "Manga", value: "manga" },
            { label: "TV Shows", value: "tv" },
            { label: "Movies", value: "movies" },
            { label: "Games", value: "games" },
            { label: "Books", value: "books" },
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
      label: "Search Media",
      category: "Actions",
      icon: <Compass className="size-4 text-primary" />,
      badge: "Search and redirect to browse",
      parameters: [
        {
          name: "type",
          label: "Media Type",
          type: "select",
          options: [
            { label: "Anime", value: "anime" },
            { label: "Manga", value: "manga" },
            { label: "TV Shows", value: "tv" },
            { label: "Movies", value: "movies" },
            { label: "Games", value: "games" },
            { label: "Books", value: "books" },
          ],
        },
        {
          name: "title",
          label: "Title",
          type: "text",
        },
      ],
      action: (params) => {
        if (!params || !params.type) return;
        const query = params.title || "";
        window.location.href = `/aquila/browse?type=${params.type}&q=${encodeURIComponent(query)}`;
      },
    });

    return actions;
  }
}
