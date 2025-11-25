import { PpuState } from "../ppu/ppu-state";
import type { IMmu, Memory } from "./types";

export default class DmaController {
    private sourceBaseAddress = 0;
    private currentByte = 0;
    private initialDelay = false;

    constructor(
        private readonly ppuState: PpuState,
        private readonly mmu: IMmu, 
        private readonly oam: Memory
    ) {}

    reset() {
        this.sourceBaseAddress = 0;
        this.currentByte = 0;
        this.ppuState.dmaActive = false;
        this.initialDelay = false;
    }

    start(value: number) {
        this.sourceBaseAddress = value << 8;
        this.currentByte = 0;
        this.ppuState.dmaActive = true;
        this.initialDelay = true;
    }

    tick4() {
        if (!this.ppuState.dmaActive) {
            return;
        }

        if (this.initialDelay) {
            this.initialDelay = false;
            return;
        }

        const sourceAddress = this.sourceBaseAddress + this.currentByte;
        const value = this.mmu.readDma(sourceAddress);
        this.oam.writeDirect(this.currentByte, value);

        this.currentByte++;

        if (this.currentByte === 160) {
            this.ppuState.dmaActive = false;
            return;
        }
    }
}
