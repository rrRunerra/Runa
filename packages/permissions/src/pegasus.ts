import { BitField } from "./bitfield";
import { PegasusFlags } from "./flags";

export class PegasusBitField extends BitField {
  public static override readonly Flags = PegasusFlags;
}
