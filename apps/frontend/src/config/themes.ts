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
    id: "runa",
    name: "Runa",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "linear-gradient(135deg, #c9a3ff, #00fff3, #ff8a00)",
        accent: "#c9a3ff",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "linear-gradient(135deg, #c9a3ff, #00fff3, #ff8a00)",
        accent: "#c9a3ff",
      },
    },
  },
  {
    id: "polaris",
    name: "Polaris",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "#c9a3ff",
        accent: "#c9a3ff",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "#c9a3ff",
        accent: "#c9a3ff",
      },
    },
  },
  {
    id: "andromeda",
    name: "Andromeda",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "#ffb49a",
        accent: "#ffb49a",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "#ffb49a",
        accent: "#ffb49a",
      },
    },
  },
  {
    id: "aquarius",
    name: "Aquarius",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "#00fff3",
        accent: "#00fff3",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "#00fff3",
        accent: "#00fff3",
      },
    },
  },
  {
    id: "pegasus",
    name: "Pegasus",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "#00ff00",
        accent: "#00ff00",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "#00ff00",
        accent: "#00ff00",
      },
    },
  },
  {
    id: "lacerta",
    name: "Lacerta",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "#a9f100",
        accent: "#a9f100",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "#a9f100",
        accent: "#a9f100",
      },
    },
  },
  {
    id: "aquila",
    name: "Aquila",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "#aeb1ff",
        accent: "#aeb1ff",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "#aeb1ff",
        accent: "#aeb1ff",
      },
    },
  },
  {
    id: "lyra",
    name: "Lyra",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "#ffa5c0",
        accent: "#ffa5c0",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "#ffa5c0",
        accent: "#ffa5c0",
      },
    },
  },
  {
    id: "monoceros",
    name: "Monoceros",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "#ead600",
        accent: "#ead600",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "#ead600",
        accent: "#ead600",
      },
    },
  },
  {
    id: "lynx",
    name: "Lynx",
    colors: {
      dark: {
        background: "oklch(0.1358 0.0163 262.7113)",
        sidebar: "oklch(0.1074 0.0120 261.1111)",
        primary: "#ff8a00",
        accent: "#ff8a00",
      },
      light: {
        background: "oklch(0.9848 0 0)",
        sidebar: "oklch(0.2064 0.0388 265.5472)",
        primary: "#ff8a00",
        accent: "#ff8a00",
      },
    },
  },
];
