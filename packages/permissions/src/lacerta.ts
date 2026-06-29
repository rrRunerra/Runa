import { BitField } from "./bitfield";
import { LacertaFlags } from "./flags";

export class LacertaBitField extends BitField {
  public static override readonly Flags = LacertaFlags;
}
