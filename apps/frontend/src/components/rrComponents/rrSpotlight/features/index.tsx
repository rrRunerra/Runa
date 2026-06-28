import { BaseSpotlightFeature } from "../BaseSpotlightFeature";

export const spotlightRegistry: Record<
  string,
  () => Promise<{ default: new () => BaseSpotlightFeature }>
> = {
  runa: () => import("./runa"),
  polaris: () => import("./polaris"),
  pegasus: () => import("./pegasus"),
  aquila: () => import("./aquila"),
  aquarius: () => import("./aquarius"),
  lacerta: () => import("./lacerta"),
  lyra: () => import("./lyra"),
  monoceros: () => import("./monoceros"),
  lynx: () => import("./lynx"),
};
