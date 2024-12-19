import { JoypadButton } from "../common/enums";
import { IJoypadHandler } from "../core/joypad/joypad-handler";

export class JoypadHandler implements IJoypadHandler {
    pressedButtons = JoypadButton.None;

    getPressedButtons(): JoypadButton {
        return this.pressedButtons;
    }

    buttonDown(button: JoypadButton) {
        this.pressedButtons |= button;
    }

    buttonUp(button: JoypadButton) {
        this.pressedButtons &= ~button;
    }
}