import { BitField } from "./bitfield";
import { AquariusFlags } from "./flags";

export class AquariusBitField extends BitField {
  public static override readonly Flags = AquariusFlags;
}
