import { BitField } from "./bitfield";
import { LynxFlags } from "./flags";

export class LynxBitField extends BitField {
  public static override readonly Flags = LynxFlags;
}
