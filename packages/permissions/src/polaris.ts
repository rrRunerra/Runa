import { BitField } from "./bitfield";
import { PolarisFlags } from "./flags";

export class PolarisBitField extends BitField {
  public static override readonly Flags = PolarisFlags;
}
