import { Memory } from "./memory";
import { Mmu } from "./mmu";
import { PpuState } from "../ppu/ppu-state";

export class DmaController {
    private sourceBaseAddress = 0;
    private currentByte = 0;

    constructor(
        private readonly ppuState: PpuState,
        private readonly mmu: Mmu, 
        private readonly oam: Memory
    ) {}

    start(value: number) {
        // Source address is value * $100
        this.sourceBaseAddress = value << 8;
        this.currentByte = 0;
        this.ppuState.dmaActive = true;
    }

    tickMCycle() {
        if (!this.ppuState.dmaActive) {
            return;
        }

        const sourceAddress = this.sourceBaseAddress | this.currentByte;
        const destAddress = 0xFE00 | this.currentByte;

        const value = this.mmu.read(sourceAddress);
        this.oam.write(destAddress, value);

        this.currentByte++;

        if (this.currentByte === 160) {
            this.ppuState.dmaActive = false;
            return;
        }
    }
}
