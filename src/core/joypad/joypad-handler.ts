import { JoypadButton } from "../../common/enums";

export class MockJoypadHandler implements IJoypadHandler {
    getPressedButtons(): JoypadButton {
        return JoypadButton.None;
    }
}

export interface IJoypadHandler {
    getPressedButtons(): JoypadButton;
}