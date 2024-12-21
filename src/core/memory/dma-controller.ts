import { Memory } from "./memory";
import { IMmu } from "./mmu";
import { PpuState } from "../ppu/ppu-state";

export class DmaController {
    private sourceBaseAddress = 0;
    private currentByte = 0;

    constructor(
        private readonly ppuState: PpuState,
        private readonly mmu: IMmu, 
        private readonly oam: Memory
    ) {}

    reset() {
        this.sourceBaseAddress = 0;
        this.currentByte = 0;
        this.ppuState.dmaActive = false;
    }

    start(value: number) {
        this.sourceBaseAddress = value << 8;
        this.currentByte = 0;
        this.ppuState.dmaActive = true;
    }

    tickMCycle() {
        if (!this.ppuState.dmaActive) {
            return;
        }

        const sourceAddress = this.sourceBaseAddress + this.currentByte;
        const value = this.mmu.readDma(sourceAddress);
        this.oam.write(this.currentByte, value);

        this.currentByte++;

        if (this.currentByte === 160) {
            this.ppuState.dmaActive = false;
            return;
        }
    }
}
