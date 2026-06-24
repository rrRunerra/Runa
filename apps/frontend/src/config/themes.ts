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
    sourceUrl: "https://tweakcn.com/editor/theme?theme=cyberpunk",
    colors: {
      dark: {
        background: "oklch(0.1649 0.0352 281.8285)",
        sidebar: "oklch(0.1649 0.0352 281.8285)",
        primary: "oklch(0.6726 0.2904 341.4084)",
        accent: "oklch(0.8903 0.1739 171.2690)",
      },
      light: {
        background: "oklch(0.9816 0.0017 247.8390)",
        sidebar: "oklch(0.9595 0.0200 286.0164)",
        primary: "oklch(0.6726 0.2904 341.4084)",
        accent: "oklch(0.8903 0.1739 171.2690)",
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
];
