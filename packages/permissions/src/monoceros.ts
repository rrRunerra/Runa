
import { BitField } from "./bitfield";
import { MonocerosFlags } from "./flags";

export class MonocerosBitField extends BitField {
  public static override readonly Flags = MonocerosFlags;
}
