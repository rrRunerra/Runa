export type ThemeConfig = {
  id: string;
  name: string;
  sourceUrl?: string;
  colors: {
    dark: {
      background: string;
      sidebar: string;
      primary: string;
      accent: string;
    };
    light: {
      background: string;
      sidebar: string;
      primary: string;
      accent: string;
    };
  };
};

export const THEMES: ThemeConfig[] = [
  {
    id: "default",
    name: "Default",
    sourceUrl: "https://tweakcn.com/themes/cmlh0vbnd000004l112kx8a0l",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "oklch(0.4865 0.2423 291.8661)",
        accent: "oklch(0.2302 0.0714 298.2794)",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "oklch(0.5424 0.2454 293.0160)",
        accent: "oklch(0.9544 0.0226 302.5680)",
      },
    },
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    sourceUrl: "https://tweakcn.com/editor/theme?theme=catppuccin",
    colors: {
      dark: {
        background: "oklch(0.2155 0.0254 284.0647)",
        sidebar: "oklch(0.1828 0.0204 284.2039)",
        primary: "oklch(0.7871 0.1187 304.7693)",
        accent: "oklch(0.8467 0.0833 210.2545)",
      },
      light: {
        background: "oklch(0.9578 0.0058 264.5321)",
        sidebar: "oklch(0.9335 0.0087 264.5206)",
        primary: "oklch(0.5547 0.2503 297.0156)",
        accent: "oklch(0.6820 0.1448 235.3822)",
      },
    },
  },
  {
    id: "cosmicNight",
    name: "Cosmic Night",
    sourceUrl: "https://tweakcn.com/editor/theme?theme=cosmic-night",
    colors: {
      dark: {
        background: "oklch(0.1743 0.0227 283.7998)",
        sidebar: "oklch(0.2284 0.0384 282.9324)",
        primary: "oklch(0.7162 0.1597 290.3962)",
        accent: "oklch(0.3354 0.0828 280.9705)",
      },
      light: {
        background: "oklch(0.9730 0.0133 286.1503)",
        sidebar: "oklch(0.9580 0.0133 286.1454)",
        primary: "oklch(0.5417 0.1790 288.0332)",
        accent: "oklch(0.9221 0.0373 262.1410)",
      },
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    sourceUrl: "https://tweakcn.com/themes/cmou2x5a4000304jmbnsz5nk4",
    colors: {
      dark: {
        background: "oklch(0.1408 0.0044 285.8229)",
        sidebar: "oklch(0.1408 0.0044 285.8229)",
        primary: "oklch(0.6317 0.2544 21.7529)",
        accent: "oklch(0.6317 0.2544 21.7529)",
      },
      light: {
        background: "oklch(0.9694 0.0152 12.4219)",
        sidebar: "oklch(1.0000 0 0)",
        primary: "oklch(0.5858 0.2220 17.5846)",
        accent: "oklch(0.8700 0.1481 202.8754)",
      },
    },
  },
  {
    id: "darkmatter",
    name: "Darkmatter",
    sourceUrl: "https://tweakcn.com/editor/theme?theme=darkmatter",
    colors: {
      dark: {
        background: "oklch(0.1797 0.0043 308.1928)",
        sidebar: "oklch(0.1822 0 0)",
        primary: "oklch(0.7214 0.1337 49.9802)",
        accent: "oklch(0.3211 0 0)",
      },
      light: {
        background: "oklch(1.0000 0 0)",
        sidebar: "oklch(0.9670 0.0029 264.5419)",
        primary: "oklch(0.6716 0.1368 48.5130)",
        accent: "oklch(0.9491 0 0)",
      },
    },
  },
  {
    id: "astra",
    name: "Astra",
    sourceUrl: "https://tweakcn.com/themes/cmofr223i000504la0dez6cfb",
    colors: {
      dark: {
        background: "oklch(0.1418 0.0662 295.8049)",
        sidebar: "oklch(0.1604 0.0696 295.6276)",
        primary: "oklch(0.7017 0.3225 328.3634)",
        accent: "oklch(0.9054 0.1546 194.7689)",
      },
      light: {
        background: "oklch(0.9714 0.0141 343.1982)",
        sidebar: "oklch(1.0000 0 0)",
        primary: "oklch(0.5916 0.2180 0.5844)",
        accent: "oklch(0.7148 0.1257 215.2209)",
      },
    },
  },
  {
    id: "violateEye",
    name: "Violate Eye",
    sourceUrl: "https://tweakcn.com/themes/cmm3earjf000004lbbthuasae",
    colors: {
      dark: {
        background: "oklch(0.1503 0.0171 289.8934)",
        sidebar: "oklch(0.1616 0.0230 287.6930)",
        primary: "oklch(0.6217 0.1799 287.7754)",
        accent: "oklch(0.2739 0.0616 285.5915)",
      },
      light: {
        background: "oklch(0.9892 0.0053 286.3028)",
        sidebar: "oklch(0.9811 0.0093 286.2277)",
        primary: "oklch(0.6217 0.1799 287.7754)",
        accent: "oklch(0.9570 0.0187 289.3286)",
      },
    },
  },
  {
    id: "apotheosis",
    name: "Apotheosis Mint Midnight",
    sourceUrl: "https://tweakcn.com/themes/cmoguqhhi000304k1cbe80jix",
    colors: {
      dark: {
        background: "oklch(0.1448 0 0)",
        sidebar: "oklch(0.1448 0 0)",
        primary: "oklch(0.5038 0.2937 285.3753)",
        accent: "oklch(0.1888 0.1055 292.0750)",
      },
      light: {
        background: "oklch(1.0000 0 0)",
        sidebar: "oklch(0.9842 0.0034 247.8575)",
        primary: "oklch(0.4568 0.2146 277.0229)",
        accent: "oklch(0.9299 0.0334 272.7879)",
      },
    },
  },
];
