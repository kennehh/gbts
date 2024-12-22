import { JoypadButton } from "./enums";

export type WorkerMessage = 
    | { type: "INIT", payload: { canvas: OffscreenCanvas } }
    | { type: "RUN" }
    | { type: "STOP" }
    | { type: "LOAD_ROM", payload: { rom: Uint8Array } }
    | { type: "JOYPAD_DOWN", payload: { button: JoypadButton } }
    | { type: "JOYPAD_UP", payload: { button: JoypadButton } }
    | { type: "THROTTLE" }
    | { type: "UNTHROTTLE" };