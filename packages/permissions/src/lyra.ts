import { BitField } from "./bitfield";
import { LyraFlags } from "./flags";

export class LyraBitField extends BitField {
  public static override readonly Flags = LyraFlags;
}
