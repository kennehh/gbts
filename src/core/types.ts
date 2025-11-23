import type { CpuState } from "./cpu";
import type { PpuState } from "./ppu/ppu-state";
import type Timer from "./timer";

export interface GameBoyState {
    cpu: CpuState,
    ppu: PpuState,
    timer: Timer,
    // TODO: Add the rest of the components
}
