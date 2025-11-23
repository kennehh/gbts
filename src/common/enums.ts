import type { ValuesOf } from "./types";

export const JoypadButton = {
    None: 0,

    Right: 1 << 0,
    Left: 1 << 1,
    Up: 1 << 2,
    Down: 1 << 3,

    A: 1 << 4,
    B: 1 << 5,
    Select: 1 << 6,
    Start: 1 << 7,
} as const;

export type JoypadButtonValue = ValuesOf<typeof JoypadButton>;