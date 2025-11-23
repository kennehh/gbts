import type { ValuesOf } from "@/common/types";

export const RegisterFlag = {
    Zero: 1 << 7,
    Subtract: 1 << 6,
    HalfCarry: 1 << 5,
    Carry: 1 << 4,
} as const;

export type RegisterFlagValue = ValuesOf<typeof RegisterFlag>;

export const CpuStatus = {
    Running: 0,
    Halted: 1,
    Stopped: 2
} as const;

export type CpuStatusValue = ValuesOf<typeof CpuStatus>;

export const InterruptFlag = {
    None: 0,
    VBlank: 1 << 0,
    LcdStat: 1 << 1,
    Timer: 1 << 2,
    Serial: 1 << 3,
    Joypad: 1 << 4,
} as const;

export type InterruptFlagValue = ValuesOf<typeof InterruptFlag>;

export interface InterruptWithVector {
    readonly interrupt: InterruptFlagValue;
    readonly vector: number;
}
