import { JoypadButton, type JoypadButtonValue } from "../common/enums";
import type { IJoypadHandler } from "../core/joypad";

export class JoypadHandler implements IJoypadHandler {
    pressedButtons = JoypadButton.None;

    getPressedButtons(): JoypadButtonValue {
        return this.pressedButtons;
    }

    buttonDown(button: JoypadButtonValue) {
        this.pressedButtons |= button;
    }

    buttonUp(button: JoypadButtonValue) {
        this.pressedButtons &= ~button;
    }
}