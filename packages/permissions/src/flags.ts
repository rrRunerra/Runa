export function defineFlags<T extends string>(
  keys: T[],
  startOffset: number = 0,
): Record<T, bigint> {
  const flags = {} as Record<T, bigint>;
  for (let i = 0; i < keys.length; i++) {
    flags[keys[i]] = 1n << BigInt(startOffset + i);
  }
  return flags;
}

// NEVER USE 900 RANGE OFFSETS

// Polaris flags occupy bits 0-99 (supports 100 permissions)
export const PolarisFlags = defineFlags(["VIEW", "MANAGE"], 0);

// Lynx flags occupy bits 100-199 (supports 100 permissions)
export const LynxFlags = defineFlags(
  [
    "VIEW",
    "MANAGE",
    "MANAGE_DATABASE",
    "GUILD_CHAT",
    "DM_CHAT",
    "VIEW_LOGS",
    "MANAGE_CONFIG",
  ],
  100,
);

// Aquila flags occupy bits 200-299 (supports 100 permissions)
export const AquilaFlags = defineFlags(
  [
    "VIEW",
    "MANAGE",
    "MANAGE_ANIME",
    "MANAGE_MANGA",
    "MANAGE_MOVIE",
    "MANAGE_TV",
    "MANAGE_GAME",
    "MANAGE_BOOK",
    "EDIT_ANIME",
    "EDIT_MANGA",
    "EDIT_MOVIE",
    "EDIT_TV",
    "EDIT_GAME",
    "EDIT_BOOK",
    "IMPORT_LIST",
    "MEDIA_REFRESH",
    "MANAGE_REVIEWS",
    "MANAGE_RECOMMENDATIONS",
  ],
  200,
);

export const PegasusFlags = defineFlags(["VIEW"], 300);

export const LacertaFlags = defineFlags(["VIEW", "UPLOAD_FILES", "MANAGE_FILES"], 400);

export const AquariusFlags = defineFlags(["VIEW"], 500);

export const LyraFlags = defineFlags(["VIEW"], 600);

export const MonocerosFlags = defineFlags(["VIEW"], 700);

export const AndromedaFlags = defineFlags(["VIEW", "MANAGE"], 800);

export const RunaFlags = defineFlags(["ADMINISTRATOR", "LOGGED_IN"], 10000);
