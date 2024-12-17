import { JoypadButton } from "../common/enums";
import { IJoypadHandler } from "../core/joypad/joypad-handler";

export class JoypadHandler implements IJoypadHandler {
    buttonsPressed(): JoypadButton {
        throw new Error("Method not implemented.");
    }

}