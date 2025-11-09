import { CpuState } from "./cpu/cpu-state"
import { PpuState } from "./ppu/ppu-state"
import { Timer } from "./timer/timer"

export interface GameBoyState {
    cpu: CpuState,
    ppu: PpuState,
    timer: Timer,
    // TODO: Add the rest of the components
}