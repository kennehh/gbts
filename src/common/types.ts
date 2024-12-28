import { JoypadButton } from "./enums";

export type ToWorkerMessage = 
    | { type: "INIT", payload: { canvas: OffscreenCanvas } }
    | { type: "RUN" }
    | { type: "STOP" }
    | { type: "LOAD_ROM", payload: { rom: Uint8Array } }
    | { type: "JOYPAD_DOWN", payload: { button: JoypadButton } }
    | { type: "JOYPAD_UP", payload: { button: JoypadButton } }
    | { type: "TURBO", payload: { turbo: boolean } };

export type FromWorkerMessage =
    | { type: "AUDIO_BUFFER", payload: { left: Float32Array, right: Float32Array } };