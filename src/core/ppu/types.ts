import type { ValuesOf } from "@/common/types";

export const PpuStatus = {
    HBlank: 0,
    VBlank: 1,
    OamScan: 2,
    Drawing: 3,
} as const;

export type PpuStatusValue = ValuesOf<typeof PpuStatus>;

export const StatInterruptSourceFlag = {
    None: 0,
    HBlank: 1 << 3,
    VBlank: 1 << 4,
    Oam: 1 << 5,
    Lcdc: 1 << 6,
} as const;

export type StatInterruptSourceFlagValue = ValuesOf<typeof StatInterruptSourceFlag>;
