import { BitField } from "./bitfield";
import { AquilaFlags } from "./flags";

export class AquilaBitField extends BitField {
  public static override readonly Flags = AquilaFlags;
}
