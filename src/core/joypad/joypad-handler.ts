import { JoypadButton } from "../../common/enums";

export interface IJoypadHandler {
    buttonsPressed(): JoypadButton;
}