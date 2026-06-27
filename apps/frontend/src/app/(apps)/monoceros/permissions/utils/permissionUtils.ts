import * as Permissions from "@runa/permissions";

export interface PermissionDefinition {
  name: string;
  flag: bigint;
  label: string;
}

export interface PermissionGroup {
  name: string;
  appName: string;
  permissions: PermissionDefinition[];
}

export function getDynamicPermissionGroups(): PermissionGroup[] {
  const groups: PermissionGroup[] = [];
  const appOrder = ["Runa", "Polaris", "Aquarius", "Pegasus", "Lacerta", "Lynx", "Aquila", "Lyra", "Monoceros"];

  const keys = Object.keys(Permissions).filter((key) => key.endsWith("Flags"));

  for (const key of keys) {
    const appName = key.replace(/Flags$/, "");
    const flagsObj = (Permissions as any)[key] as Record<string, bigint>;
    if (!flagsObj || typeof flagsObj !== "object") continue;

    const permissions: PermissionDefinition[] = Object.entries(flagsObj).map(([flagName, flagValue]) => {
      const label = flagName
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

      return {
        name: flagName,
        flag: flagValue,
        label: appName === "Runa" ? label : `${label} (${appName})`,
      };
    });

    groups.push({
      name: appName === "Runa" ? "Global / Platform" : `${appName} Application`,
      appName,
      permissions,
    });
  }

  groups.sort((a, b) => {
    const indexA = appOrder.indexOf(a.appName);
    const indexB = appOrder.indexOf(b.appName);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  return groups;
}

export function isPermissionEnabled(userPermissions: number[], flag: bigint): boolean {
  return Permissions.hasPermission(userPermissions, flag);
}

export function togglePermissionInArray(userPermissions: number[], flag: bigint): number[] {
  const bitfield = Permissions.BitField.fromRaw(userPermissions);
  if (bitfield.has(flag)) {
    bitfield.remove(flag);
  } else {
    bitfield.add(flag);
  }
  return bitfield.serialize();
}

export interface LegacyPermission {
  flag: bigint;
  bitIndex: number;
}

export function getLegacyOrUnknownPermissions(userPermissions: number[]): LegacyPermission[] {
  const groups = getDynamicPermissionGroups();
  const definedBits: number[] = [];
  
  for (const group of groups) {
    for (const perm of group.permissions) {
      const resolved = Permissions.BitField.resolve(perm.flag, {});
      const maxLength = Math.max(definedBits.length, resolved.length);
      for (let i = 0; i < maxLength; i++) {
        definedBits[i] = (definedBits[i] || 0) | (resolved[i] || 0);
      }
    }
  }

  const legacy: LegacyPermission[] = [];
  const maxWords = Math.max(userPermissions.length, definedBits.length);
  
  for (let wordIndex = 0; wordIndex < maxWords; wordIndex++) {
    const userWord = userPermissions[wordIndex] || 0;
    const definedWord = definedBits[wordIndex] || 0;
    const legacyWord = userWord & ~definedWord;
    
    if (legacyWord !== 0) {
      for (let bitOffset = 0; bitOffset < 32; bitOffset++) {
        const bitMask = 1 << bitOffset;
        if ((legacyWord & bitMask) !== 0) {
          const bitIndex = wordIndex * 32 + bitOffset;
          legacy.push({
            flag: 1n << BigInt(bitIndex),
            bitIndex,
          });
        }
      }
    }
  }

  return legacy;
}
