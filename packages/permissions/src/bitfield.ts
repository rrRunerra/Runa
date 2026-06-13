import { PolarisFlags, LynxFlags, AquilaFlags } from "./flags";

export type BitFieldResolvable =
  | bigint
  | string
  | BitField
  | { raw: number[] }
  | number[]
  | BitFieldResolvable[];

export class BitField {
  public static readonly Flags: Record<string, bigint> = {
    ADMINISTRATOR: 1n << 999n,
  };

  protected bits: number[] = [];

  constructor(resolvable?: BitFieldResolvable) {
    if (resolvable !== undefined) {
      this.bits = BitField.resolve(resolvable, this.flags);
    }
  }

  protected get flags(): Record<string, bigint> {
    return (this.constructor as typeof BitField).Flags;
  }

  private static flagToBits(flag: bigint): number[] {
    if (flag <= 0n) {
      throw new Error(`Invalid flag: must be a positive bigint, got ${flag}`);
    }

    const result: number[] = [];
    let temp = flag;
    let bitIndex = 0;
    while (temp > 0n) {
      if ((temp & 1n) === 1n) {
        const wordIndex = Math.floor(bitIndex / 32);
        const bitMask = 1 << (bitIndex % 32);
        result[wordIndex] = (result[wordIndex] || 0) | bitMask;
      }
      temp >>= 1n;
      bitIndex++;
    }

    // Fill missing words with 0
    for (let i = 0; i < result.length; i++) {
      if (result[i] === undefined) {
        result[i] = 0;
      }
    }
    return result;
  }

  public static resolve(resolvable: BitFieldResolvable, flags: Record<string, bigint>): number[] {
    if (resolvable instanceof BitField) {
      return [...resolvable.bits];
    }

    if (typeof resolvable === "object" && resolvable !== null) {
      if ("raw" in resolvable && Array.isArray(resolvable.raw)) {
        return [...resolvable.raw];
      }
      if (Array.isArray(resolvable)) {
        if (resolvable.length > 0 && typeof resolvable[0] === "number") {
          return [...(resolvable as number[])];
        }
        const result: number[] = [];
        for (const r of resolvable) {
          const resolved = BitField.resolve(r as BitFieldResolvable, flags);
          const maxLength = Math.max(result.length, resolved.length);
          for (let i = 0; i < maxLength; i++) {
            result[i] = (result[i] || 0) | (resolved[i] || 0);
          }
        }
        return result;
      }
    }

    if (typeof resolvable === "string") {
      const flagValue = flags[resolvable] || BitField.Flags[resolvable];
      if (flagValue === undefined) {
        throw new Error(`Invalid permission flag: ${resolvable}`);
      }
      return BitField.flagToBits(flagValue);
    }

    if (typeof resolvable === "bigint") {
      return BitField.flagToBits(resolvable);
    }

    throw new Error("Invalid BitFieldResolvable type");
  }

  public static fromRaw(raw: number[]): BitField {
    return new this({ raw });
  }

  private isAdministratorCheck(resolvable: BitFieldResolvable): boolean {
    try {
      const otherBits = BitField.resolve(resolvable, this.flags);
      if (otherBits.length !== 32) return false;
      for (let i = 0; i < 31; i++) {
        if (otherBits[i] !== 0) return false;
      }
      return otherBits[31] === 128; // 1 << 7 (999 % 32)
    } catch {
      return false;
    }
  }

  public has(resolvable: BitFieldResolvable): boolean {
    const adminWord = this.bits[31] || 0;
    const hasAdmin = (adminWord & 128) !== 0;

    if (hasAdmin && !this.isAdministratorCheck(resolvable)) {
      return true;
    }

    const otherBits = BitField.resolve(resolvable, this.flags);
    for (let i = 0; i < otherBits.length; i++) {
      const otherWord = otherBits[i] || 0;
      const thisWord = this.bits[i] || 0;
      if ((thisWord & otherWord) !== otherWord) {
        return false;
      }
    }
    return true;
  }

  public any(resolvable: BitFieldResolvable): boolean {
    const adminWord = this.bits[31] || 0;
    const hasAdmin = (adminWord & 128) !== 0;

    if (hasAdmin) {
      return true;
    }

    const otherBits = BitField.resolve(resolvable, this.flags);
    for (let i = 0; i < otherBits.length; i++) {
      const otherWord = otherBits[i] || 0;
      const thisWord = this.bits[i] || 0;
      if ((thisWord & otherWord) !== 0) {
        return true;
      }
    }
    return false;
  }

  public add(resolvable: BitFieldResolvable): this {
    const otherBits = BitField.resolve(resolvable, this.flags);
    const maxLength = Math.max(this.bits.length, otherBits.length);
    for (let i = 0; i < maxLength; i++) {
      this.bits[i] = (this.bits[i] || 0) | (otherBits[i] || 0);
    }
    return this;
  }

  public remove(resolvable: BitFieldResolvable): this {
    const otherBits = BitField.resolve(resolvable, this.flags);
    for (let i = 0; i < this.bits.length; i++) {
      const otherWord = otherBits[i] || 0;
      this.bits[i] &= ~otherWord;
    }
    while (this.bits.length > 0 && this.bits[this.bits.length - 1] === 0) {
      this.bits.pop();
    }
    return this;
  }

  public serialize(): number[] {
    return [...this.bits];
  }
}

export const DEFAULT_PERMISSIONS: readonly number[] = new BitField([
  PolarisFlags.VIEW,
  PolarisFlags.LOGGED_IN,
  LynxFlags.LOGGED_IN,
  AquilaFlags.LOGGED_IN,
]).serialize();

export function hasPermission(
  permissions: number[] | undefined,
  permission: BitFieldResolvable,
  checkType: "all" | "any" = "all",
  flags: Record<string, bigint> = BitField.Flags
): boolean {
  if (!permissions) return false;
  const bitfield = new BitField(permissions);
  return checkType === "any" ? bitfield.any(permission) : bitfield.has(permission);
}
