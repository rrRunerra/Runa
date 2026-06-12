export function defineFlags<T extends string>(keys: T[], startOffset: number = 0): Record<T, bigint> {
  const flags = {} as Record<T, bigint>;
  for (let i = 0; i < keys.length; i++) {
    flags[keys[i]] = 1n << BigInt(startOffset + i);
  }
  return flags;
}

// NEVER USE 900 RANGE OFFSETS

// Polaris flags occupy bits 0-99 (supports 100 permissions)
export const PolarisFlags = defineFlags([
  "VIEW",
  "MANAGE",
], 0);

// Lynx flags occupy bits 100-199 (supports 100 permissions)
export const LynxFlags = defineFlags([
  "VIEW",
  "MANAGE",
], 100);

// Aquila flags occupy bits 200-299 (supports 100 permissions)
export const AquilaFlags = defineFlags([
  "VIEW",
  "MANAGE",
], 200);
