import type { JoypadButtonValue } from "@/common/enums";

export interface IJoypadHandler {
    getPressedButtons(): JoypadButtonValue;
}
