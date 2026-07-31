import {
  AndromedaFlags,
  PolarisFlags,
  LynxFlags,
  AquilaFlags,
  PegasusFlags,
  AquariusFlags,
  LacertaFlags,
  LyraFlags,
  MonocerosFlags,
} from "@runa/permissions";

// https://sleepopolis.com/education/constellations-stars/

export const rrApps: rrApp[] = [
  {
    name: "Polaris",
    href: "/polaris",
    color: "#c9a3ff",
    iconLeftRing: "/polaris/polaris-512-left-ring.png",
    iconLeftNoRing: "/polaris/polaris-512-left-noring.png",
    iconRightRing: "/polaris/polaris-512-right-ring.png",
    iconRightNoRing: "/polaris/polaris-512-right-noring.png",
    description: "Landing page",
    descriptionShort: "Account",
  },
  {
    name: "Andromeda",
    href: "/andromeda",
    color: "#ffb49a",
    iconLeftRing: "/andromeda/andromeda-512-left-ring.png",
    iconLeftNoRing: "/andromeda/andromeda-512-left-noring.png",
    iconRightRing: "/andromeda/andromeda-512-right-ring.png",
    iconRightNoRing: "/andromeda/andromeda-512-right-noring.png",
    description: "Docs/Knowledge base",
    descriptionShort: "Knowledge hub",
    permissions: [AndromedaFlags.VIEW],
  },
  {
    name: "Aquarius",
    href: "/aquarius",
    color: "#00fff3",
    iconLeftRing: "/aquarius/aquarius-512-left-ring.png",
    iconLeftNoRing: "/aquarius/aquarius-512-left-noring.png",
    iconRightRing: "/aquarius/aquarius-512-right-ring.png",
    iconRightNoRing: "/aquarius/aquarius-512-right-noring.png",
    description: "Social features",
    descriptionShort: "Social",
    permissions: [AquariusFlags.VIEW],
  },
  {
    name: "Pegasus",
    href: "/pegasus",
    color: "#00ff00",
    iconLeftRing: "/pegasus/pegasus-512-left-ring.png",
    iconLeftNoRing: "/pegasus/pegasus-512-left-noring.png",
    iconRightRing: "/pegasus/pegasus-512-right-ring.png",
    iconRightNoRing: "/pegasus/pegasus-512-right-noring.png",
    description: "Email client.",
    descriptionShort: "Email",
  },
  {
    name: "Lacerta",
    href: "/lacerta",
    color: "#a9f100",
    iconLeftRing: "/lacerta/lacerta-512-left-ring.png",
    iconLeftNoRing: "/lacerta/lacerta-512-left-noring.png",
    iconRightRing: "/lacerta/lacerta-512-right-ring.png",
    iconRightNoRing: "/lacerta/lacerta-512-right-noring.png",
    description: "Cloud storage",
    descriptionShort: "Storage",
  },

  {
    name: "Aquila",
    href: "/aquila",
    color: "#aeb1ff",
    iconLeftRing: "/aquila/aquila-512-left-ring.png",
    iconLeftNoRing: "/aquila/aquila-512-left-noring.png",
    iconRightRing: "/aquila/aquila-512-right-ring.png",
    iconRightNoRing: "/aquila/aquila-512-right-noring.png",
    description: "Media tracker",
    descriptionShort: "Media",
  },
  {
    name: "Lyra",
    href: "/lyra",
    color: "#ffa5c0",
    iconLeftRing: "/lyra/lyra-512-left-ring.png",
    iconLeftNoRing: "/lyra/lyra-512-left-noring.png",
    iconRightRing: "/lyra/lyra-512-right-ring.png",
    iconRightNoRing: "/lyra/lyra-512-right-noring.png",
    description: "Music player",
    descriptionShort: "Music",
    permissions: [LyraFlags.VIEW],
  },
  {
    name: "Monoceros",
    href: "/monoceros",
    color: "#ead600",
    iconLeftRing: "/monoceros/monoceros-512-left-ring.png",
    iconLeftNoRing: "/monoceros/monoceros-512-left-noring.png",
    iconRightRing: "/monoceros/monoceros-512-right-ring.png",
    iconRightNoRing: "/monoceros/monoceros-512-right-noring.png",
    description: "Admin panel for Runa",
    descriptionShort: "Admin",
    permissions: [MonocerosFlags.VIEW],
  },

  {
    name: "Lynx",
    href: "/lynx",
    color: "#ff8a00",
    iconLeftRing: "/lynx/lynx-512-left-ring.png",
    iconLeftNoRing: "/lynx/lynx-512-left-noring.png",
    iconRightRing: "/lynx/lynx-512-right-ring.png",
    iconRightNoRing: "/lynx/lynx-512-right-noring.png",
    description: "Discord bot management",
    descriptionShort: "Discord bot",
  },
];

export interface rrApp {
  name: string;
  href: string;
  color: string;
  iconLeftRing: string;
  iconLeftNoRing: string;
  iconRightRing: string;
  iconRightNoRing: string;
  description: string;
  descriptionShort: string;
  permissions?: bigint[];
}
