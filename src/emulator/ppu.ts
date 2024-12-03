import { InterruptManager } from "./interrupt-manager";

export interface IPpu {
    tick(): void;
    readVram(address: number): number;
    writeVram(address: number, value: number): void;
    readOam(address: number): number;
    writeOam(address: number, value: number): void;
    readRegister(address: number): number;
    writeRegister(address: number, value: number): void;
    dmaTransfer(data: Uint8Array): void;
}

export class Ppu implements IPpu {
    constructor(private interruptManager: InterruptManager) {
    }
    dmaTransfer(data: Uint8Array): void {
        // TODO: Implement DMA transfer
    }
    readRegister(address: number): number {
        // TODO: Implement PPU register read
        return 0xFF;
    }
    writeRegister(address: number, value: number): void {
        // TODO: Implement PPU register write
    }
    readVram(address: number): number {
        // TODO: Implement VRAM read
        return 0xFF;
    }
    writeVram(address: number, value: number): void {
        // TODO: Implement VRAM write
    }
    readOam(address: number): number {
        // TODO: Implement OAM read
        return 0xFF;
    }
    writeOam(address: number, value: number): void {
        // TODO: Implement OAM write
    }    
    tick() {
    }
}