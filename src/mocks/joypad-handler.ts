import { JoypadButton, type JoypadButtonValue } from "../common/enums";
import type { IJoypadHandler } from "../core/joypad";

export class MockJoypadHandler implements IJoypadHandler {
    getPressedButtons(): JoypadButtonValue {
        return JoypadButton.None;
    }
}

