import { BitField } from "./bitfield";
import { AndromedaFlags } from "./flags";

export class AndromedaBitField extends BitField {
  public static override readonly Flags = AndromedaFlags;
}
